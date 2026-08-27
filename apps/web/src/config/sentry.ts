/**
 * Resolve a config do Sentry do front a partir de `import.meta.env`.
 *
 * Função pura (recebe o env, não lê global) pra ser testável com um objeto
 * simples — mesmo padrão do `resolveSentryConfig` da API.
 *
 * Sem `VITE_SENTRY_DSN` → `enabled: false` e o `Sentry.init` não roda. Não há
 * fail-fast aqui como na API: um front sem observabilidade não "serve gente
 * cego", só reporta menos — e o DSN é embutido no bundle em build time, então
 * a ausência apareceria no build, não em runtime.
 */
export interface WebSentryConfig {
  enabled: boolean;
  dsn: string | undefined;
  environment: string;
  release: string | undefined;
  tracesSampleRate: number;
}

const DEFAULT_TRACES_SAMPLE_RATE = 0.1;

export function resolveWebSentryConfig(env: ImportMetaEnv): WebSentryConfig {
  const dsn = (env.VITE_SENTRY_DSN ?? '').trim() || undefined;

  // String vazia não pode virar 0 e desligar o tracing em silêncio.
  const rawSampleRate = (env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? '').trim();
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
    environment: (env.VITE_SENTRY_ENVIRONMENT ?? '').trim() || env.MODE,
    release: (env.VITE_SENTRY_RELEASE ?? '').trim() || undefined,
    tracesSampleRate,
  };
}
