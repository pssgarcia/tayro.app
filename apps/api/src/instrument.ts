import * as Sentry from '@sentry/nestjs';
import { resolveSentryConfig } from './shared/config/sentry';

/**
 * Inicialização do Sentry. Importado como a PRIMEIRA linha de `main.ts` — antes
 * de qualquer `@nestjs/*` — para a auto-instrumentação de `http`/`express`/
 * `prisma` conseguir aplicar os patches antes dos módulos carregarem.
 *
 * Sem DSN (dev local, CI), `resolveSentryConfig` devolve `enabled: false` e o
 * `init` não roda — o SDK fica inerte. Em produção, `resolveSentryConfig` já
 * teria lançado no boot se o DSN faltasse (ver sentry.ts).
 */
const cfg = resolveSentryConfig(process.env);

if (cfg.enabled) {
  Sentry.init({
    dsn: cfg.dsn,
    environment: cfg.environment,
    release: cfg.release,
    tracesSampleRate: cfg.tracesSampleRate,
    // Sem IP, sem cookie, sem corpo de request por padrão.
    sendDefaultPii: false,
    beforeSend(event) {
      // Defesa em profundidade: nunca mandar credencial pro Sentry, mesmo que
      // uma integração futura passe a anexar headers/corpo.
      const request = event.request;
      if (request) {
        const url = typeof request.url === 'string' ? request.url : '';
        if (url.includes('/auth/')) {
          delete request.data;
        }
        if (request.headers) {
          delete request.headers.authorization;
          delete request.headers.Authorization;
          delete request.headers.cookie;
          delete request.headers.Cookie;
        }
      }
      return event;
    },
  });
}
