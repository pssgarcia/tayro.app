// PRIMEIRA linha, como em main.ts: o Sentry instrumenta http/express/prisma
// antes dos módulos carregarem.
import './instrument';
import { createApp } from './bootstrap';
import { createServerlessHandler } from './serverless-handler';

// Equivale ao `node --enable-source-maps` do start:prod: numa função não dá pra
// passar flag pro node, e sem isto o stack trace no Sentry aponta pro dist/.
process.setSourceMapsEnabled(true);

/**
 * Ponto de entrada da API na Vercel (D-24). Importado por
 * `apps/web/api/index.ts`. Mesma montagem do `main.ts` (via `createApp`), sem
 * `listen`: quem escuta a porta é a Vercel.
 */
export const handler = createServerlessHandler(() => createApp());
