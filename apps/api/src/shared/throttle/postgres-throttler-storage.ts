import { Injectable } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import * as Sentry from '@sentry/nestjs';
import { PrismaService } from '../infrastructure/database/prisma.service';

interface Row {
  hits: number;
  ms_to_expire: number;
  ms_to_unblock: number;
}

export interface PostgresThrottlerStorageOptions {
  /** Chance (0..1) de cada increment disparar a limpeza das linhas vencidas. */
  cleanupProbability?: number;
  random?: () => number;
}

/**
 * Store do @nestjs/throttler no Postgres (D-24).
 *
 * POR QUE: o store padrão é um Map em memória. Numa função serverless cada
 * instância tem o próprio Map, e o limite de /auth/* (5/15min por IP, regra
 * inviolável) passaria a valer por instância. Aqui todas as instâncias dividem
 * a mesma tabela.
 *
 * ATOMICIDADE: o incremento é UM comando (`INSERT … ON CONFLICT DO UPDATE …
 * RETURNING`). O Postgres trava a linha da chave durante o UPDATE, então duas
 * requisições simultâneas nunca leem o mesmo valor (sem check-then-act).
 *
 * SEMÂNTICA: janela FIXA por chave (a janela começa no 1º hit e dura `ttl`),
 * não a janela deslizante do Map padrão, que expira cada hit individualmente.
 * Consequência aceita: na virada da janela cabem até 2×limit em sequência
 * (ex.: 5 no fim de uma janela + 5 no começo da próxima). O bloqueio segue o
 * padrão da lib: a chamada limit+1 bloqueia por `blockDuration`, e enquanto
 * bloqueada não acumula hits.
 *
 * Toda a aritmética de tempo é feita com o relógio do BANCO (`now()`), nunca o
 * do processo: instâncias diferentes têm relógios diferentes, o banco é um só.
 *
 * FALHA ABERTA: se o banco falhar, a requisição passa (e o erro vai pro
 * Sentry). Fechar derrubaria TODA rota com 500 (o throttle global vale pra
 * todas), e as operações que o limite protege (login, cadastro, candidatura)
 * dependem do mesmo banco: com ele fora, elas falham de qualquer jeito.
 */
@Injectable()
export class PostgresThrottlerStorage implements ThrottlerStorage {
  private readonly cleanupProbability: number;
  private readonly random: () => number;
  private pendingCleanup: Promise<void> = Promise.resolve();

  constructor(
    private readonly prisma: PrismaService,
    options: PostgresThrottlerStorageOptions = {},
  ) {
    this.cleanupProbability = options.cleanupProbability ?? 0.01;
    this.random = options.random ?? Math.random;
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    // Faz parte da interface; a chave já vem com o nome do throttler embutido.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _throttlerName?: string,
  ): Promise<ThrottlerStorageRecord> {
    let row: Row;
    try {
      row = await this.upsert(key, ttl, limit, blockDuration);
    } catch (err) {
      Sentry.captureException(err, {
        tags: { area: 'throttle', op: 'increment' },
      });
      return {
        totalHits: 0,
        timeToExpire: 0,
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    }

    if (this.random() < this.cleanupProbability) {
      // Não espera: a limpeza não pode atrasar a resposta. Erro só vai pro Sentry.
      this.pendingCleanup = this.deleteExpired().catch((err) => {
        Sentry.captureException(err, {
          tags: { area: 'throttle', op: 'cleanup' },
        });
      });
    }

    const msToUnblock = Number(row.ms_to_unblock);
    return {
      totalHits: Number(row.hits),
      timeToExpire: Math.max(0, Math.ceil(Number(row.ms_to_expire) / 1000)),
      isBlocked: msToUnblock > 0,
      timeToBlockExpire: Math.max(0, Math.ceil(msToUnblock / 1000)),
    };
  }

  /**
   * Apaga linhas cuja janela venceu e que não estão num bloqueio ativo. Linha
   * apagada é idêntica a linha inexistente pro `increment`, então não há
   * corrida a proteger aqui.
   */
  async deleteExpired(): Promise<void> {
    await this.prisma.$executeRaw`
      DELETE FROM "throttle_hits"
      WHERE "expiresAt" <= (now() AT TIME ZONE 'UTC')
        AND ("blockedUntil" IS NULL OR "blockedUntil" <= (now() AT TIME ZONE 'UTC'))
    `;
  }

  /** Espera a limpeza em andamento, se houver. Para testes e encerramento. */
  idle(): Promise<void> {
    return this.pendingCleanup;
  }

  private async upsert(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
  ): Promise<Row> {
    // Dentro do DO UPDATE, `t.*` é a linha ANTIGA. Três casos, nesta ordem:
    //   bloqueio ativo           → nada muda (não acumula hit)
    //   janela ou bloqueio venceu → recomeça: 1 hit, janela nova, sem bloqueio
    //   senão                     → +1; se passou do limite, bloqueia agora
    // Os timestamps são guardados em UTC sem fuso, como o Prisma grava DateTime.
    const rows = await this.prisma.$queryRaw<Row[]>`
      WITH params AS (
        -- Truncado em ms porque a coluna é TIMESTAMP(3): sem isso, now + ttl
        -- arredonda ao gravar e o tempo restante sai 1s maior que o ttl.
        SELECT date_trunc('milliseconds', now() AT TIME ZONE 'UTC') AS now,
               make_interval(secs => ${ttl}::double precision / 1000) AS ttl,
               make_interval(secs => ${blockDuration}::double precision / 1000) AS block,
               ${limit}::int AS lim
      ),
      up AS (
        INSERT INTO "throttle_hits" AS t ("key", "hits", "expiresAt", "blockedUntil")
        SELECT ${key}, 1, p.now + p.ttl,
               CASE WHEN 1 > p.lim THEN p.now + p.block END
        FROM params p
        ON CONFLICT ("key") DO UPDATE SET
          "hits" = CASE
            WHEN t."blockedUntil" > (SELECT now FROM params) THEN t."hits"
            WHEN t."blockedUntil" IS NOT NULL OR t."expiresAt" <= (SELECT now FROM params) THEN 1
            ELSE t."hits" + 1
          END,
          "expiresAt" = CASE
            WHEN t."blockedUntil" > (SELECT now FROM params) THEN t."expiresAt"
            WHEN t."blockedUntil" IS NOT NULL OR t."expiresAt" <= (SELECT now FROM params)
              THEN (SELECT now + ttl FROM params)
            ELSE t."expiresAt"
          END,
          "blockedUntil" = CASE
            WHEN t."blockedUntil" > (SELECT now FROM params) THEN t."blockedUntil"
            WHEN t."blockedUntil" IS NOT NULL OR t."expiresAt" <= (SELECT now FROM params)
              THEN CASE WHEN 1 > (SELECT lim FROM params) THEN (SELECT now + block FROM params) END
            WHEN t."hits" + 1 > (SELECT lim FROM params) THEN (SELECT now + block FROM params)
            ELSE NULL
          END
        RETURNING t."hits", t."expiresAt", t."blockedUntil"
      )
      SELECT up."hits",
             GREATEST(0, EXTRACT(EPOCH FROM (up."expiresAt" - p.now)) * 1000)::double precision AS ms_to_expire,
             COALESCE(GREATEST(0, EXTRACT(EPOCH FROM (up."blockedUntil" - p.now)) * 1000), 0)::double precision AS ms_to_unblock
      FROM up, params p
    `;
    return rows[0];
  }
}
