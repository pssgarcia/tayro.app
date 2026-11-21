import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { VERCEL_REWRITE_PARAM } from './serverless-handler';

interface Rewrite {
  source: string;
  destination: string;
  has?: { type: string; key: string; value?: string }[];
}

const vercel = JSON.parse(
  readFileSync(join(__dirname, '../../web/vercel.json'), 'utf8'),
) as { rewrites: Rewrite[] };

/**
 * O roteamento da API na Vercel mora em apps/web/vercel.json, longe deste
 * código. Estes testes amarram os dois lados (D-24).
 */
describe('apps/web/vercel.json × função serverless', () => {
  const toFunction = vercel.rewrites.filter(
    (r) => r.destination === '/api/index',
  );

  it('o parâmetro capturado pelo rewrite é o mesmo que o handler remove', () => {
    // Se divergirem, a Vercel injeta ?<nome>=... na query e a ValidationPipe
    // devolve 400 em toda rota com DTO de query (mordeu no canário, 2026-11-20).
    expect(toFunction.length).toBeGreaterThan(0);
    for (const r of toFunction) {
      expect(r.source).toBe(`/api/:${VERCEL_REWRITE_PARAM}*`);
    }
  });

  it('a regra da função vem ANTES da regra genérica de /api/* (a 1ª que casa vence)', () => {
    const firstFunction = vercel.rewrites.findIndex(
      (r) => r.destination === '/api/index',
    );
    const firstOtherApi = vercel.rewrites.findIndex(
      (r) => r.source.startsWith('/api/') && r.destination !== '/api/index',
    );
    if (firstOtherApi !== -1) expect(firstFunction).toBeLessThan(firstOtherApi);
  });
});
