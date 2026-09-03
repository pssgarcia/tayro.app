/**
 * Resolve a config do Sentry a partir do ambiente.
 *
 * Mesma filosofia do `resolveAllowedOrigins` (cors.ts): em produção, rodar sem
 * observabilidade é uma falha, não algo para mascarar com fallback. Se
 * `SENTRY_DSN` faltar em produção, FALHA na inicialização — o deploy morre no
 * boot em vez de servir gente com a API cega (um erro em produção só se
 * descobre por reclamação sem isso).
 *
 * Fora de produção, DSN ausente é normal: `.env` local não tem, e o
 * `Sentry.init` simplesmente não roda (`enabled: false`).
 */
export interface SentryConfig {
  enabled: boolean;
  dsn: string | undefined;
  environment: string;
  release: string | undefined;
  tracesSampleRate: number;
}

const DEFAULT_TRACES_SAMPLE_RATE = 0.1;

export function resolveSentryConfig(
  env: Record<string, string | undefined>,
): SentryConfig {
  const dsn = (env.SENTRY_DSN ?? '').trim() || undefined;

  if (dsn === undefined && env.NODE_ENV === 'production') {
    throw new Error(
      'SENTRY_DSN é obrigatório em produção. Sem ele a API roda sem captura ' +
        'de erro e uma falha só aparece por reclamação. Mesma regra do ' +
        'ALLOWED_ORIGINS (ver cors.ts).',
    );
  }

  // String vazia (`SENTRY_TRACES_SAMPLE_RATE=` no .env) NÃO pode virar 0 e
  // desligar o tracing em silêncio — trata como ausente.
  const rawSampleRate = (env.SENTRY_TRACES_SAMPLE_RATE ?? '').trim();
  const parsedSampleRate = rawSampleRate === '' ? NaN : Number(rawSampleRate);
  const tracesSampleRate =
    Number.isFinite(parsedSampleRate) &&
    parsedSampleRate >= 0 &&
    parsedSampleRate <= 1
      ? parsedSampleRate
      : DEFAULT_TRACES_SAMPLE_RATE;

  return {
    enabled: dsn !== undefined,
    dsn,
    environment:
      (env.SENTRY_ENVIRONMENT ?? '').trim() ||
      (env.NODE_ENV ?? '').trim() ||
      'development',
    // Railway injeta RAILWAY_GIT_COMMIT_SHA em todo build; liga cada evento ao
    // commit que estava no ar.
    release:
      (env.SENTRY_RELEASE ?? '').trim() ||
      (env.RAILWAY_GIT_COMMIT_SHA ?? '').trim() ||
      undefined,
    tracesSampleRate,
  };
}
