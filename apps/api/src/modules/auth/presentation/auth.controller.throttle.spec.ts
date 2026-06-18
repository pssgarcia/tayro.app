/**
 * Garante que o throttle estrito de credenciais (5 req / 15 min) está aplicado
 * nos endpoints certos e ausente nos endpoints de tráfego legítimo frequente.
 *
 * Lê a metadata que @Throttle({ default: ... }) grava nos métodos do controller
 * (chaves THROTTLER:LIMITdefault / THROTTLER:TTLdefault). É um guard de regressão:
 * se alguém remover o decorator, este teste pega.
 */
import { AuthController } from './auth.controller';
import { AUTH_THROTTLE } from '../../../shared/throttle/auth-throttle';

const LIMIT_KEY = 'THROTTLER:LIMITdefault';
const TTL_KEY = 'THROTTLER:TTLdefault';

const getThrottle = (method: keyof AuthController) => ({
  limit: Reflect.getMetadata(LIMIT_KEY, AuthController.prototype[method]),
  ttl: Reflect.getMetadata(TTL_KEY, AuthController.prototype[method]),
});

describe('AuthController — throttle de credenciais', () => {
  it('AUTH_THROTTLE é 5 requisições por 15 minutos', () => {
    expect(AUTH_THROTTLE.limit).toBe(5);
    expect(AUTH_THROTTLE.ttl).toBe(15 * 60 * 1000);
  });

  it.each(['login', 'registerBrand', 'registerInfluencer'] as const)(
    'aplica o throttle estrito em %s',
    (method) => {
      const { limit, ttl } = getThrottle(method);
      expect(limit).toBe(AUTH_THROTTLE.limit);
      expect(ttl).toBe(AUTH_THROTTLE.ttl);
    },
  );

  it.each(['refresh', 'logout'] as const)(
    'NÃO aplica o throttle estrito em %s (tráfego legítimo frequente, já guardado por JWT)',
    (method) => {
      const { limit } = getThrottle(method);
      expect(limit).toBeUndefined();
    },
  );
});
