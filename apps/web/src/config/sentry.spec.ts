import { describe, it, expect } from 'vitest';
import { resolveWebSentryConfig } from './sentry';

const DSN = 'https://abc@o1.ingest.de.sentry.io/2';

/** Monta um ImportMetaEnv de teste — MODE é sempre definido pelo Vite. */
function env(overrides: Partial<ImportMetaEnv> = {}): ImportMetaEnv {
  return { MODE: 'test', ...overrides } as ImportMetaEnv;
}

describe('resolveWebSentryConfig', () => {
  it('sem DSN, retorna enabled: false', () => {
    const cfg = resolveWebSentryConfig(env());
    expect(cfg.enabled).toBe(false);
    expect(cfg.dsn).toBeUndefined();
  });

  it('DSN só de espaços conta como ausente', () => {
    expect(resolveWebSentryConfig(env({ VITE_SENTRY_DSN: '  ' })).enabled).toBe(
      false,
    );
  });

  it('com DSN, retorna enabled: true e o DSN sem espaços nas pontas', () => {
    const cfg = resolveWebSentryConfig(env({ VITE_SENTRY_DSN: `  ${DSN}  ` }));
    expect(cfg.enabled).toBe(true);
    expect(cfg.dsn).toBe(DSN);
  });

  it('environment: usa VITE_SENTRY_ENVIRONMENT, senão o MODE do Vite', () => {
    expect(
      resolveWebSentryConfig(
        env({ VITE_SENTRY_DSN: DSN, VITE_SENTRY_ENVIRONMENT: 'production' }),
      ).environment,
    ).toBe('production');
    expect(
      resolveWebSentryConfig(env({ VITE_SENTRY_DSN: DSN, MODE: 'staging' }))
        .environment,
    ).toBe('staging');
  });

  it('release: usa VITE_SENTRY_RELEASE, senão undefined', () => {
    expect(
      resolveWebSentryConfig(
        env({ VITE_SENTRY_DSN: DSN, VITE_SENTRY_RELEASE: 'abc123' }),
      ).release,
    ).toBe('abc123');
    expect(
      resolveWebSentryConfig(env({ VITE_SENTRY_DSN: DSN })).release,
    ).toBeUndefined();
  });

  it('tracesSampleRate: default 0.1 quando ausente, vazio, inválido, negativo ou > 1', () => {
    for (const value of [undefined, '', '  ', 'abc', '-1', '2']) {
      expect(
        resolveWebSentryConfig(
          env({ VITE_SENTRY_DSN: DSN, VITE_SENTRY_TRACES_SAMPLE_RATE: value }),
        ).tracesSampleRate,
      ).toBe(0.1);
    }
  });

  it('tracesSampleRate: respeita um valor válido dentro de [0, 1]', () => {
    expect(
      resolveWebSentryConfig(
        env({ VITE_SENTRY_DSN: DSN, VITE_SENTRY_TRACES_SAMPLE_RATE: '0' }),
      ).tracesSampleRate,
    ).toBe(0);
    expect(
      resolveWebSentryConfig(
        env({ VITE_SENTRY_DSN: DSN, VITE_SENTRY_TRACES_SAMPLE_RATE: '0.3' }),
      ).tracesSampleRate,
    ).toBe(0.3);
  });
});
