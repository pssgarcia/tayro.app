import { useEffect } from 'react';
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { resolveWebSentryConfig } from './config/sentry';

/**
 * Inicialização do Sentry no front. Importado como a PRIMEIRA linha de
 * `main.tsx`, antes do React montar.
 *
 * Sem `VITE_SENTRY_DSN` (dev, CI) o `init` não roda — o SDK fica inerte.
 * Session Replay fica DE FORA de propósito: não há captura de consentimento
 * hoje e o replay gravaria o DOM de `/apply/:id` e `/auth/*` (LGPD).
 */
const cfg = resolveWebSentryConfig(import.meta.env);

if (cfg.enabled && !Sentry.getClient()) {
  Sentry.init({
    dsn: cfg.dsn,
    environment: cfg.environment,
    release: cfg.release,
    tracesSampleRate: cfg.tracesSampleRate,
    sendDefaultPii: false,
    integrations: [
      // Router legado (<Routes>, não data router) — precisa das funções do
      // react-router injetadas à mão.
      Sentry.reactRouterV7BrowserTracingIntegration({
        useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
    ],
    beforeSend(event) {
      // Defesa em profundidade: nunca mandar o Bearer token pro Sentry.
      const headers = event.request?.headers;
      if (headers) {
        delete headers.Authorization;
        delete headers.authorization;
      }
      return event;
    },
  });
}
