interface TrackableRequest {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
}

/**
 * De quem é a requisição, pro rate limit (D-24).
 *
 * Na Vercel (`VERCEL=1`, definido pela própria plataforma): `x-real-ip`. A doc
 * da Vercel diz que ele traz o IP público do cliente e que a Vercel sobrescreve
 * os cabeçalhos de IP mandados pelo cliente pra impedir spoofing.
 *
 * Fora da Vercel (dev local, testes): `req.ip`, sem ler cabeçalho nenhum.
 * Ler `x-forwarded-for` sem um proxy confiável na frente trocaria o limite por
 * um que qualquer um burla mandando o cabeçalho. Histórico: no Railway, atrás
 * do rewrite da Vercel, isso dava o IP de um proxy compartilhado por todo
 * mundo; foi o que levou a API pra Vercel (D-24).
 */
export function clientIpTracker(req: TrackableRequest): string {
  if (process.env.VERCEL === '1') {
    const header = req.headers['x-real-ip'];
    const ip = (Array.isArray(header) ? header[0] : header)?.trim();
    if (ip) return ip;
  }
  return req.ip || 'unknown';
}
