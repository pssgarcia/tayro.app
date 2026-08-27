import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  getClient: vi.fn(() => undefined),
  reactRouterV7BrowserTracingIntegration: vi.fn(() => ({ name: 'mock-router' })),
}));

describe('instrument — init do Sentry', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('sem VITE_SENTRY_DSN, não chama Sentry.init', async () => {
    const Sentry = await import('@sentry/react');
    await import('./instrument');

    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it('com VITE_SENTRY_DSN, inicializa 1x sem PII e com a integração de router', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://abc@o1.ingest.de.sentry.io/2');

    const Sentry = await import('@sentry/react');
    await import('./instrument');

    expect(Sentry.init).toHaveBeenCalledTimes(1);
    const options = vi.mocked(Sentry.init).mock.calls[0][0] ?? {};
    expect(options.sendDefaultPii).toBe(false);
    expect(options.dsn).toContain('ingest.de.sentry.io');
    expect(Sentry.reactRouterV7BrowserTracingIntegration).toHaveBeenCalled();
  });
});
