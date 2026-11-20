import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';

/**
 * Endpoint público pro smoke test do CD e pro canário da migração (D-24).
 * "De pé" quer dizer "consegue falar com o banco": função viva com o banco
 * inacessível não atende ninguém, e o smoke test tem que ver isso.
 */
describe('HealthController', () => {
  it('200 com status ok quando o banco responde', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };
    const controller = new HealthController(prisma as never);

    await expect(controller.check()).resolves.toEqual({ status: 'ok' });
    expect(prisma.$queryRaw).toHaveBeenCalled();
  });

  it('503 quando o banco falha, sem vazar a mensagem do erro', async () => {
    const prisma = {
      $queryRaw: jest
        .fn()
        .mockRejectedValue(
          new Error('connect ECONNREFUSED 10.0.0.1:5432 senha=x'),
        ),
    };
    const controller = new HealthController(prisma as never);

    const err = await controller.check().catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ServiceUnavailableException);
    expect(
      JSON.stringify((err as ServiceUnavailableException).getResponse()),
    ).not.toMatch(/ECONNREFUSED|senha/);
  });
});
