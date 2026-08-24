/**
 * Variáveis lidas com `getOrThrow` em tempo de REQUEST — nunca no boot.
 *
 * Essa é a diferença que importa: uma variável lida no construtor de um
 * provider (RAPIDAPI_*, RESEND_*) já falha na inicialização, e o deploy morre
 * antes de servir alguém. As de baixo são lidas dentro de um handler, então a
 * ausência delas passa pelo boot, pelo healthcheck e pelo smoke test — e só
 * aparece como 500 na cara de quem estava usando o produto.
 *
 * MORDEU EM 2026-08-24: `FRONTEND_URL` faltava no Railway. A 1ª candidatura de
 * cada creator nova criava a conta e então explodia ao montar o link do claim,
 * devolvendo 500; a 2ª tentativa passava (a conta já existia). Ficou assim em
 * produção sem ninguém notar porque nada no boot olhava essa variável.
 */
export const REQUIRED_ENV_IN_PRODUCTION = [
  // creators.service — monta a URL do /claim no e-mail de conta CLAIMABLE
  'FRONTEND_URL',
  // auth.service — assinatura dos tokens em todo login/cadastro/refresh
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'JWT_ACCESS_EXPIRES_IN',
  'JWT_REFRESH_EXPIRES_IN',
] as const;

/**
 * Falha o boot em produção se faltar qualquer variável obrigatória.
 *
 * Mesmo princípio do `resolveAllowedOrigins`: config errada é falha, não algo
 * para mascarar com fallback. A diferença é o momento em que se descobre —
 * aqui, no deploy, e não no primeiro usuário que tenta se candidatar.
 *
 * Fora de produção não valida nada: `.env` local é parcial de propósito
 * (provider stub, sem Resend, sem RapidAPI) e travar o boot por isso só
 * ensinaria a ignorar o erro.
 */
export function assertRequiredEnv(
  env: Record<string, string | undefined>,
): void {
  if (env.NODE_ENV !== 'production') return;

  const missing = REQUIRED_ENV_IN_PRODUCTION.filter(
    (key) => (env[key] ?? '').trim().length === 0,
  );

  if (missing.length === 0) return;

  // Lista todas de uma vez — descobrir uma por deploy quebrado é o pior jeito.
  throw new Error(
    `Variáveis de ambiente obrigatórias ausentes em produção: ${missing.join(', ')}. ` +
      'Elas são lidas durante requisições, então a ausência não apareceria no ' +
      'boot — apareceria como 500 para o usuário.',
  );
}
