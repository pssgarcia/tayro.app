import { ThrottlerModuleOptions, ThrottlerOptions } from '@nestjs/throttler';
import { ThrottlerStorage } from '@nestjs/throttler';
import { PrismaService } from '../infrastructure/database/prisma.service';
import { PostgresThrottlerStorage } from './postgres-throttler-storage';
import { clientIpTracker } from './client-ip-tracker';

/**
 * Configuração do ThrottlerModule. Os contadores ficam no Postgres (ver
 * PostgresThrottlerStorage e D-24), compartilhados entre instâncias.
 * Endpoints de credenciais reforçam o limite via @Throttle (AUTH_THROTTLE).
 */
/** A variante objeto de ThrottlerModuleOptions (a outra é um array sem storage). */
type ThrottlerOptionsWithStorage = Extract<
  ThrottlerModuleOptions,
  { throttlers: unknown }
> & {
  throttlers: ThrottlerOptions[];
  storage: ThrottlerStorage;
  getTracker: (req: Record<string, any>) => string;
};

export function throttlerOptionsFactory(
  prisma: PrismaService,
): ThrottlerOptionsWithStorage {
  return {
    throttlers: [{ name: 'default', ttl: 60_000, limit: 60 }],
    storage: new PostgresThrottlerStorage(prisma),
    getTracker: clientIpTracker,
  };
}
