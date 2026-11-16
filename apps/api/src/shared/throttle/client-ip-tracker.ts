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
 * Fora da Vercel: `req.ip`, sem ler cabeçalho nenhum. No Railway, atrás do
 * rewrite da Vercel, isso dá o IP de um proxy, compartilhado por todo mundo
 * (Known Gap em specs/creator-discovery-and-apply). Não há conserto confiável
 * lá: o Railway não documenta quais cabeçalhos sobrescreve, e com a Vercel na
 * frente o x-real-ip dele é o IP da Vercel. Ler cabeçalho ali só trocaria o
 * limite compartilhado por um limite que qualquer um burla. O conserto é a
 * API passar a rodar na Vercel.
 */
export function clientIpTracker(req: TrackableRequest): string {
  if (process.env.VERCEL === '1') {
    const header = req.headers['x-real-ip'];
    const ip = (Array.isArray(header) ? header[0] : header)?.trim();
    if (ip) return ip;
  }
  return req.ip || 'unknown';
}
