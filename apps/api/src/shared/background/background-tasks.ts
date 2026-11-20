import { Injectable, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { waitUntil } from '@vercel/functions';

/** Quanto o flush do Sentry pode segurar a função depois da tarefa. */
const SENTRY_FLUSH_TIMEOUT_MS = 2000;

/**
 * Roda trabalho DEPOIS da resposta HTTP, em servidor comum e em serverless
 * (D-24).
 *
 * - `setImmediate`: a tarefa só começa depois que quem chamou devolveu a
 *   resposta. A creator não espera uma API externa.
 * - `waitUntil`: numa função da Vercel, a instância pode ser congelada assim que
 *   a resposta sai; isso segura ela viva até a tarefa (e o envio do Sentry)
 *   terminar. Fora da Vercel é no-op (lê um contexto de request que não
 *   existe), então não há `if (VERCEL)` aqui.
 * - Nunca rejeita: a tarefa deve tratar os próprios erros esperados; o que
 *   escapar vai pro Sentry. Rejeição solta viraria `unhandledRejection`.
 */
@Injectable()
export class BackgroundTasks {
  private readonly logger = new Logger(BackgroundTasks.name);

  run(task: () => Promise<unknown>): Promise<void> {
    const done = new Promise<void>((resolve) => setImmediate(resolve))
      .then(task)
      .then(
        () => undefined,
        (err: unknown) => {
          const reason = err instanceof Error ? err.message : String(err);
          this.logger.error(`Tarefa em background falhou: ${reason}`);
          Sentry.captureException(err, { tags: { area: 'background-task' } });
        },
      );

    waitUntil(
      done.then(() =>
        Sentry.flush(SENTRY_FLUSH_TIMEOUT_MS).then(
          () => undefined,
          () => undefined,
        ),
      ),
    );
    return done;
  }
}
