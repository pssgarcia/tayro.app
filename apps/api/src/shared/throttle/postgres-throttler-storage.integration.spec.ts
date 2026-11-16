import { PrismaClient } from '@prisma/client';
import { PostgresThrottlerStorage } from './postgres-throttler-storage';

/**
 * Teste de INTEGRAÇÃO: roda contra um Postgres de verdade, porque o que importa
 * aqui (atomicidade do incremento sob concorrência, janela calculada pelo
 * relógio do banco) não existe num mock do Prisma.
 *
 * Só roda com INTEGRATION_DATABASE_URL apontando pra um banco DESCARTÁVEL (no
 * CI, o serviço postgres do job; localmente, um container). Nunca usa
 * DATABASE_URL, que localmente aponta pro branch de dev do Neon. No CI, pular
 * é proibido: sem a variável o arquivo falha, em vez de ficar verde sem testar.
 */
const url = process.env.INTEGRATION_DATABASE_URL;
if (!url && process.env.CI) {
  throw new Error(
    'INTEGRATION_DATABASE_URL ausente no CI: o teste do throttle não pode ser pulado.',
  );
}
const describeDb = url ? describe : describe.skip;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describeDb('PostgresThrottlerStorage (Postgres real)', () => {
  let prisma: PrismaClient;
  let storage: PostgresThrottlerStorage;
  let n = 0;
  const key = () => `test-key-${Date.now()}-${n++}`;

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url } } });
    await prisma.$connect();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe('DELETE FROM "throttle_hits"');
    storage = new PostgresThrottlerStorage(prisma as any, {
      cleanupProbability: 0,
    });
  });

  afterAll(async () => {
    await prisma.$executeRawUnsafe('DELETE FROM "throttle_hits"');
    await prisma.$disconnect();
  });

  it('primeira chamada conta 1 hit, não bloqueia e devolve o tempo da janela em segundos', async () => {
    const r = await storage.increment(key(), 60_000, 5, 60_000, 'default');

    expect(r.totalHits).toBe(1);
    expect(r.isBlocked).toBe(false);
    expect(r.timeToExpire).toBeGreaterThan(55);
    expect(r.timeToExpire).toBeLessThanOrEqual(60);
    expect(r.timeToBlockExpire).toBe(0);
  });

  it('a chamada limit+1 bloqueia, e o bloqueio dura blockDuration', async () => {
    const k = key();
    for (let i = 1; i <= 5; i++) {
      const r = await storage.increment(k, 900_000, 5, 900_000, 'default');
      expect(r.isBlocked).toBe(false);
      expect(r.totalHits).toBe(i);
    }

    const sexta = await storage.increment(k, 900_000, 5, 900_000, 'default');

    expect(sexta.isBlocked).toBe(true);
    expect(sexta.timeToBlockExpire).toBeGreaterThan(895);
    expect(sexta.timeToBlockExpire).toBeLessThanOrEqual(900);
  });

  it('enquanto bloqueado, continua bloqueado e não acumula hits', async () => {
    const k = key();
    for (let i = 0; i < 6; i++)
      await storage.increment(k, 60_000, 5, 60_000, 'default');

    const r = await storage.increment(k, 60_000, 5, 60_000, 'default');

    expect(r.isBlocked).toBe(true);
    expect(r.totalHits).toBe(6);
  });

  // O motivo de existir este store: com o Map padrão, cada instância da função
  // serverless teria o próprio contador. Aqui duas "instâncias" (dois objetos)
  // dividem o mesmo banco e, portanto, o mesmo limite.
  it('duas instâncias do store compartilham o mesmo contador', async () => {
    const k = key();
    const outra = new PostgresThrottlerStorage(prisma as any, {
      cleanupProbability: 0,
    });

    for (let i = 0; i < 3; i++)
      await storage.increment(k, 60_000, 5, 60_000, 'default');
    for (let i = 0; i < 2; i++)
      await outra.increment(k, 60_000, 5, 60_000, 'default');

    expect(
      (await storage.increment(k, 60_000, 5, 60_000, 'default')).isBlocked,
    ).toBe(true);
  });

  // Check-then-act seria ler, somar e gravar em passos separados: duas
  // requisições simultâneas leriam o mesmo valor e uma contagem se perderia.
  it('incrementos concorrentes não perdem contagem (incremento atômico)', async () => {
    const k = key();

    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        storage.increment(k, 60_000, 100, 60_000, 'default'),
      ),
    );

    expect(results.map((r) => r.totalHits).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 20 }, (_, i) => i + 1),
    );
  });

  it('sob concorrência, exatamente as chamadas além do limite são bloqueadas', async () => {
    const k = key();

    const results = await Promise.all(
      Array.from({ length: 12 }, () =>
        storage.increment(k, 60_000, 5, 60_000, 'default'),
      ),
    );

    expect(results.filter((r) => !r.isBlocked)).toHaveLength(5);
  });

  it('janela vencida recomeça a contagem do zero', async () => {
    const k = key();
    for (let i = 0; i < 4; i++)
      await storage.increment(k, 300, 5, 300, 'default');

    await sleep(450);
    const r = await storage.increment(k, 300, 5, 300, 'default');

    expect(r.totalHits).toBe(1);
    expect(r.isBlocked).toBe(false);
  });

  it('bloqueio vencido libera e recomeça a contagem', async () => {
    const k = key();
    for (let i = 0; i < 6; i++)
      await storage.increment(k, 300, 5, 300, 'default');

    await sleep(450);
    const r = await storage.increment(k, 300, 5, 300, 'default');

    expect(r.isBlocked).toBe(false);
    expect(r.totalHits).toBe(1);
  });

  it('chaves diferentes (IPs diferentes) não interferem entre si', async () => {
    const a = key();
    const b = key();
    for (let i = 0; i < 6; i++)
      await storage.increment(a, 60_000, 5, 60_000, 'default');

    const r = await storage.increment(b, 60_000, 5, 60_000, 'default');

    expect(r.isBlocked).toBe(false);
    expect(r.totalHits).toBe(1);
  });

  it('limpeza apaga só linhas vencidas e sem bloqueio ativo', async () => {
    const velha = key();
    const bloqueada = key();
    const viva = key();
    await storage.increment(velha, 100, 5, 100, 'default');
    for (let i = 0; i < 6; i++)
      await storage.increment(bloqueada, 100, 5, 60_000, 'default');
    await storage.increment(viva, 60_000, 5, 60_000, 'default');
    await sleep(250);

    await storage.deleteExpired();

    const keys = (
      await prisma.$queryRawUnsafe<{ key: string }[]>(
        'SELECT "key" FROM "throttle_hits"',
      )
    ).map((r) => r.key);
    expect(keys).not.toContain(velha);
    expect(keys).toContain(bloqueada);
    expect(keys).toContain(viva);
  });

  it('com cleanupProbability 1, cada increment dispara a limpeza', async () => {
    const velha = key();
    await storage.increment(velha, 100, 5, 100, 'default');
    await sleep(250);

    const sempreLimpa = new PostgresThrottlerStorage(prisma as any, {
      cleanupProbability: 1,
    });
    await sempreLimpa.increment(key(), 60_000, 5, 60_000, 'default');
    await sempreLimpa.idle();

    const rows = await prisma.$queryRawUnsafe<{ key: string }[]>(
      `SELECT "key" FROM "throttle_hits" WHERE "key" = '${velha}'`,
    );
    expect(rows).toHaveLength(0);
  });
});
