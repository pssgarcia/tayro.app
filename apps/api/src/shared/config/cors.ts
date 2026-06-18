const DEV_DEFAULT_ORIGINS = ['http://localhost:5173'];

/**
 * Resolve a allow-list de CORS a partir do ambiente.
 *
 * Regra de segurança (inviolável): em produção, CORS é uma allow-list explícita.
 * Se ALLOWED_ORIGINS estiver ausente/vazia em produção, FALHA na inicialização
 * em vez de cair silenciosamente num default — uma config errada de CORS é uma
 * falha de segurança, não algo para mascarar com fallback.
 */
export function resolveAllowedOrigins(env: {
  NODE_ENV?: string;
  ALLOWED_ORIGINS?: string;
}): string[] {
  const origins =
    env.ALLOWED_ORIGINS?.split(',')
      .map((o) => o.trim())
      .filter((o) => o.length > 0) ?? [];

  if (origins.length > 0) return origins;

  if (env.NODE_ENV === 'production') {
    throw new Error(
      'ALLOWED_ORIGINS é obrigatório em produção — defina a allow-list de CORS ' +
        '(ex: ALLOWED_ORIGINS=https://tayro-app.vercel.app).',
    );
  }

  return DEV_DEFAULT_ORIGINS;
}
