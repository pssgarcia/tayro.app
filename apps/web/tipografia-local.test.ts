/**
 * As fontes do TAYRO são hospedadas por nós, nunca por terceiro.
 *
 * Até 2026-09-04 as três famílias vinham de fonts.googleapis.com por <link> no
 * index.html. Isso fazia o navegador de TODO visitante abrir conexão com o
 * Google em TODA página, inclusive nas públicas e antes de qualquer login,
 * entregando IP, user-agent e referer. Era o único terceiro que recebia isso
 * direto do dispositivo da pessoa, e obrigava a Política de Privacidade a
 * declará-lo.
 *
 * Este teste existe porque a Política agora afirma o contrário: que carregar
 * uma página não estabelece conexão com fornecedor externo de fontes. Um
 * <link> reintroduzido sem querer transformaria o documento legal em mentira,
 * e nada mais no projeto perceberia.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const indexHtml = readFileSync(join(__dirname, 'index.html'), 'utf-8');
const fontsDir = join(__dirname, 'src/assets/fonts');
const fontsCss = readFileSync(join(fontsDir, 'fonts.css'), 'utf-8');

describe('tipografia hospedada localmente', () => {
  it('index.html não carrega nada do Google', () => {
    expect(indexHtml).not.toMatch(/fonts\.googleapis\.com/);
    expect(indexHtml).not.toMatch(/fonts\.gstatic\.com/);
    expect(indexHtml).not.toMatch(/preconnect/);
  });

  it('index.html não carrega folha de estilo nem fonte de domínio externo', () => {
    // Mais amplo que o teste acima de propósito: trocar o Google por outra CDN
    // de fontes resolveria o sintoma e manteria o problema.
    const externos = [...indexHtml.matchAll(/(?:href|src)=["'](https?:\/\/[^"']+)["']/g)].map(
      (m) => m[1],
    );
    expect(externos).toEqual([]);
  });

  it('todo @font-face aponta para arquivo local que existe no repositório', () => {
    const urls = [...fontsCss.matchAll(/url\(['"]?([^'")]+)['"]?\)/g)].map((m) => m[1]);
    expect(urls.length).toBeGreaterThan(0);

    for (const url of urls) {
      expect(url).not.toMatch(/^https?:/);
      expect(url).toMatch(/^\.\//);
      expect(existsSync(join(fontsDir, url))).toBe(true);
    }
  });

  it('cobre as três famílias com os pesos que o produto usa', () => {
    const faces = [...fontsCss.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((m) => m[1]);
    const par = (bloco: string) => {
      const familia = /font-family:\s*'([^']+)'/.exec(bloco)?.[1];
      const peso = /font-weight:\s*(\d+)/.exec(bloco)?.[1];
      return `${familia} ${peso}`;
    };
    const combinacoes = new Set(faces.map(par));

    // Exatamente o conjunto que o Google servia antes da migração. Acrescentar
    // Inter 700 ou JetBrains Mono 600 aqui MUDA a aparência do produto: hoje
    // esses dois pesos caem no vizinho (600 e 700, respectivamente). Se for
    // pra mudar, que seja decisão de design, não efeito colateral.
    expect([...combinacoes].sort()).toEqual([
      'Inter 400',
      'Inter 500',
      'Inter 600',
      'JetBrains Mono 400',
      'JetBrains Mono 500',
      'JetBrains Mono 700',
      'Space Grotesk 400',
      'Space Grotesk 500',
      'Space Grotesk 600',
      'Space Grotesk 700',
    ]);
  });

  it('todo @font-face usa font-display: swap', () => {
    const faces = [...fontsCss.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((m) => m[1]);
    expect(faces.length).toBe(20);
    faces.forEach((bloco) => expect(bloco).toMatch(/font-display:\s*swap/));
  });
});
