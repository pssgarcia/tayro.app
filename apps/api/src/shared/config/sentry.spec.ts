import { resolveSentryConfig } from './sentry';

describe('resolveSentryConfig', () => {
  const DSN = 'https://abc@o1.ingest.de.sentry.io/2';

  it('sem DSN fora de produção, retorna enabled: false', () => {
    const cfg = resolveSentryConfig({ NODE_ENV: 'development' });
    expect(cfg.enabled).toBe(false);
    expect(cfg.dsn).toBeUndefined();
  });

  it('DSN só de espaços conta como ausente', () => {
    const cfg = resolveSentryConfig({ NODE_ENV: 'test', SENTRY_DSN: '   ' });
    expect(cfg.enabled).toBe(false);
    expect(cfg.dsn).toBeUndefined();
  });

  it('com DSN, retorna enabled: true e o DSN sem espaços nas pontas', () => {
    const cfg = resolveSentryConfig({ SENTRY_DSN: `  ${DSN}  ` });
    expect(cfg.enabled).toBe(true);
    expect(cfg.dsn).toBe(DSN);
  });

  it('em produção SEM SENTRY_DSN, lança erro explícito (fail-fast)', () => {
    expect(() => resolveSentryConfig({ NODE_ENV: 'production' })).toThrow(
      /SENTRY_DSN/,
    );
  });

  it('em produção com SENTRY_DSN só de espaços, lança erro', () => {
    expect(() =>
      resolveSentryConfig({ NODE_ENV: 'production', SENTRY_DSN: '  ' }),
    ).toThrow(/SENTRY_DSN/);
  });

  it('environment: usa SENTRY_ENVIRONMENT, senão NODE_ENV, senão "development"', () => {
    expect(
      resolveSentryConfig({ SENTRY_DSN: DSN, SENTRY_ENVIRONMENT: 'staging' })
        .environment,
    ).toBe('staging');
    expect(
      resolveSentryConfig({ SENTRY_DSN: DSN, NODE_ENV: 'production' })
        .environment,
    ).toBe('production');
    expect(resolveSentryConfig({ SENTRY_DSN: DSN }).environment).toBe(
      'development',
    );
  });

  it('release: SENTRY_RELEASE tem precedência sobre RAILWAY_GIT_COMMIT_SHA', () => {
    expect(
      resolveSentryConfig({
        SENTRY_DSN: DSN,
        SENTRY_RELEASE: 'v1.2.3',
        RAILWAY_GIT_COMMIT_SHA: 'deadbeef',
      }).release,
    ).toBe('v1.2.3');
    expect(
      resolveSentryConfig({
        SENTRY_DSN: DSN,
        RAILWAY_GIT_COMMIT_SHA: 'deadbeef',
      }).release,
    ).toBe('deadbeef');
    expect(resolveSentryConfig({ SENTRY_DSN: DSN }).release).toBeUndefined();
  });

  it('tracesSampleRate: default 0.1 quando ausente, vazio, inválido, negativo ou > 1', () => {
    expect(resolveSentryConfig({ SENTRY_DSN: DSN }).tracesSampleRate).toBe(0.1);
    // String vazia não pode virar 0 e desligar o tracing sem ninguém pedir.
    expect(
      resolveSentryConfig({ SENTRY_DSN: DSN, SENTRY_TRACES_SAMPLE_RATE: '' })
        .tracesSampleRate,
    ).toBe(0.1);
    expect(
      resolveSentryConfig({ SENTRY_DSN: DSN, SENTRY_TRACES_SAMPLE_RATE: '   ' })
        .tracesSampleRate,
    ).toBe(0.1);
    expect(
      resolveSentryConfig({ SENTRY_DSN: DSN, SENTRY_TRACES_SAMPLE_RATE: 'abc' })
        .tracesSampleRate,
    ).toBe(0.1);
    expect(
      resolveSentryConfig({
        SENTRY_DSN: DSN,
        SENTRY_TRACES_SAMPLE_RATE: '-0.5',
      }).tracesSampleRate,
    ).toBe(0.1);
    expect(
      resolveSentryConfig({ SENTRY_DSN: DSN, SENTRY_TRACES_SAMPLE_RATE: '2' })
        .tracesSampleRate,
    ).toBe(0.1);
  });

  it('tracesSampleRate: respeita um valor válido dentro de [0, 1]', () => {
    expect(
      resolveSentryConfig({ SENTRY_DSN: DSN, SENTRY_TRACES_SAMPLE_RATE: '0' })
        .tracesSampleRate,
    ).toBe(0);
    expect(
      resolveSentryConfig({
        SENTRY_DSN: DSN,
        SENTRY_TRACES_SAMPLE_RATE: '0.25',
      }).tracesSampleRate,
    ).toBe(0.25);
  });
});
