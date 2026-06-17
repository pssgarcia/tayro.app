/**
 * Throttle estrito para endpoints de credenciais (/auth/login, /auth/register/*).
 *
 * 5 requisições por 15 minutos por IP — defesa contra brute-force de senha e
 * spam de cadastro. O throttle global (60/min) não é suficiente para credenciais:
 * 60 tentativas de senha por minuto é um ataque viável.
 *
 * Sobrescreve o throttler 'default' apenas nos handlers decorados, via
 * @Throttle({ default: AUTH_THROTTLE }).
 */
export const AUTH_THROTTLE = {
  limit: 5,
  ttl: 15 * 60 * 1000, // 15 minutos em ms
} as const;
