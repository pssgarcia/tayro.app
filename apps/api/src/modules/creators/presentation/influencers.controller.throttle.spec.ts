/**
 * `DELETE /influencers/me` faz `bcrypt.compare` a cada tentativa, igual a
 * `changePassword`/`changeEmail` em `/auth/*` — sem throttle estrito vira
 * oráculo de força-bruta barato mesmo autenticado. Mesmo padrão de
 * `auth.controller.throttle.spec.ts`.
 */
import { InfluencersController } from './influencers.controller';
import { AUTH_THROTTLE } from '../../../shared/throttle/auth-throttle';

const LIMIT_KEY = 'THROTTLER:LIMITdefault';
const TTL_KEY = 'THROTTLER:TTLdefault';

const getThrottle = (method: keyof InfluencersController) => ({
  limit: Reflect.getMetadata(
    LIMIT_KEY,
    InfluencersController.prototype[method],
  ),
  ttl: Reflect.getMetadata(TTL_KEY, InfluencersController.prototype[method]),
});

describe('InfluencersController — throttle', () => {
  it('aplica o throttle estrito de credenciais em deleteMe', () => {
    const { limit, ttl } = getThrottle('deleteMe');
    expect(limit).toBe(AUTH_THROTTLE.limit);
    expect(ttl).toBe(AUTH_THROTTLE.ttl);
  });

  it.each(['getMe', 'updateMe', 'exportMyData'] as const)(
    'NÃO aplica o throttle estrito em %s (leitura/gravação sem bcrypt)',
    (method) => {
      const { limit } = getThrottle(method);
      expect(limit).toBeUndefined();
    },
  );
});
