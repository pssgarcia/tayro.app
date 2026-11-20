import type { IncomingMessage, ServerResponse } from 'node:http';
import type { INestApplication } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { waitUntil } from '@vercel/functions';

type RequestListener = (req: IncomingMessage, res: ServerResponse) => void;

/** Quanto o flush do Sentry pode segurar a função depois da resposta. */
const SENTRY_FLUSH_TIMEOUT_MS = 2000;

/**
 * Handler da função serverless (D-24), separado do ponto de entrada pra ser
 * testável sem subir o Sentry nem o AppModule.
 *
 * - O app nasce UMA vez por instância (cold start caro) e atende todas as
 *   requisições dela. Requisições simultâneas no cold start esperam a mesma
 *   promessa, não criam dois apps.
 * - Se a criação falhar, a promessa é descartada: a próxima requisição tenta
 *   de novo, em vez de a instância ficar presa num erro pra sempre. A resposta
 *   é um 500 genérico (stack e mensagem nunca vazam pro cliente).
 * - Depois de cada resposta, o envio pendente do Sentry vai pro `waitUntil`:
 *   sem isso, a instância pode congelar com o evento ainda na fila.
 */
export function createServerlessHandler(
  create: () => Promise<INestApplication>,
): (req: IncomingMessage, res: ServerResponse) => Promise<void> {
  let ready: Promise<RequestListener> | undefined;

  const boot = (): Promise<RequestListener> => {
    ready ??= create()
      .then(async (app) => {
        await app.init();
        return app.getHttpAdapter().getInstance() as RequestListener;
      })
      .catch((err: unknown) => {
        ready = undefined;
        throw err;
      });
    return ready;
  };

  return async (req, res) => {
    res.once('finish', () => {
      waitUntil(
        Sentry.flush(SENTRY_FLUSH_TIMEOUT_MS).then(
          () => undefined,
          () => undefined,
        ),
      );
    });

    let listener: RequestListener;
    try {
      listener = await boot();
    } catch (err) {
      console.error('Falha ao subir a API', err);
      Sentry.captureException(err, { tags: { area: 'serverless-boot' } });
      res.statusCode = 500;
      res.setHeader('content-type', 'application/json');
      res.end(
        JSON.stringify({ statusCode: 500, message: 'Internal server error' }),
      );
      return;
    }
    listener(req, res);
  };
}
