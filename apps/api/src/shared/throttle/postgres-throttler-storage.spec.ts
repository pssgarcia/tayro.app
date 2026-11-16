import * as Sentry from '@sentry/nestjs';
import { PostgresThrottlerStorage } from './postgres-throttler-storage';

jest.mock('@sentry/nestjs', () => ({ captureException: jest.fn() }));

/**
 * Comportamento sem banco (o resto está no .integration.spec, contra Postgres real).
 */
describe('PostgresThrottlerStorage · falha do banco', () => {
  beforeEach(() => jest.clearAllMocks());

  it('falha ABERTA: banco fora deixa a requisição passar e reporta ao Sentry', async () => {
    const erro = new Error('connection refused');
    const prisma = {
      $queryRaw: jest.fn().mockRejectedValue(erro),
      $executeRaw: jest.fn(),
    };
    const storage = new PostgresThrottlerStorage(prisma as any, {
      cleanupProbability: 0,
    });

    const r = await storage.increment('k', 60_000, 5, 60_000, 'default');

    expect(r.isBlocked).toBe(false);
    expect(Sentry.captureException).toHaveBeenCalledWith(erro, {
      tags: { area: 'throttle', op: 'increment' },
    });
  });

  it('falha da limpeza não afeta a resposta, só vai pro Sentry', async () => {
    const erro = new Error('timeout');
    const prisma = {
      $queryRaw: jest
        .fn()
        .mockResolvedValue([
          { hits: 1, ms_to_expire: 60_000, ms_to_unblock: 0 },
        ]),
      $executeRaw: jest.fn().mockRejectedValue(erro),
    };
    const storage = new PostgresThrottlerStorage(prisma as any, {
      cleanupProbability: 1,
    });

    const r = await storage.increment('k', 60_000, 5, 60_000, 'default');
    await storage.idle();

    expect(r).toEqual({
      totalHits: 1,
      timeToExpire: 60,
      isBlocked: false,
      timeToBlockExpire: 0,
    });
    expect(Sentry.captureException).toHaveBeenCalledWith(erro, {
      tags: { area: 'throttle', op: 'cleanup' },
    });
  });

  it('limpeza é sorteada: com random acima da probabilidade, não roda', async () => {
    const prisma = {
      $queryRaw: jest
        .fn()
        .mockResolvedValue([{ hits: 1, ms_to_expire: 1000, ms_to_unblock: 0 }]),
      $executeRaw: jest.fn(),
    };
    const storage = new PostgresThrottlerStorage(prisma as any, {
      cleanupProbability: 0.01,
      random: () => 0.5,
    });

    await storage.increment('k', 60_000, 5, 60_000, 'default');

    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });
});
