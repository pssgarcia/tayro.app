/**
 * Copy visível NÃO pode nascer solta no JSX: tem que vir do dicionário.
 *
 * Este teste existe pelo mesmo motivo do `copy-sem-travessao.test.ts`: regra
 * que vive só no README volta a ser quebrada na sessão seguinte. Sem ele,
 * qualquer string nova escrita direto num componente fica invisível pro
 * `en.ts` (que só acusa chave FALTANDO, não copy que nunca virou chave) e a
 * versão em inglês apodrece em silêncio, uma tela por vez.
 *
 * O sinal é ACENTUAÇÃO PORTUGUESA em texto que o usuário lê. É estreito de
 * propósito: pega o caso comum sem inventar heurística de idioma. Copy em
 * português sem nenhum acento ("Nome", "Salvar") escapa — o `en.ts` e a
 * revisão humana cobrem esse resto.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = join(__dirname, 'src');

const ACENTO = /[ãõçáéíóúâêôàÃÕÇÁÉÍÓÚÂÊÔÀ]/;

/**
 * Fora do escopo, com motivo:
 *  · `i18n/` é o próprio dicionário;
 *  · os dois documentos legais e a moldura deles ficam só em português (o
 *    aceite grava versão sem guardar idioma — ver `i18n/README.md`);
 *  · `config/legal.ts` são os rótulos citados DENTRO do texto jurídico.
 */
const FORA = [
  'src/i18n',
  'src/pages/public/TermsOfUsePage.tsx',
  'src/pages/public/PrivacyPolicyPage.tsx',
  'src/components/legal/LegalDocument.tsx',
  'src/config/legal.ts',
];

function arquivosFonte(dir: string): string[] {
  return readdirSync(dir).flatMap((nome: string): string[] => {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) return arquivosFonte(caminho);
    if (!/\.tsx?$/.test(nome)) return [];
    if (/\.(spec|test)\./.test(nome)) return [];
    return [caminho];
  });
}

/** Zera comentários (rastreando aspas, pra `https://` não virar comentário). */
function semComentarios(fonte: string): string {
  const s = fonte
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, (m) => ' '.repeat(m.length))
    .replace(/\/\*[\s\S]*?\*\//g, (m) => ' '.repeat(m.length));
  return s
    .split('\n')
    .map((linha) => {
      let quote: string | null = null;
      for (let i = 0; i < linha.length; i++) {
        const c = linha[i];
        if (quote) {
          if (c === '\\') i++;
          else if (c === quote) quote = null;
        } else if (c === "'" || c === '"' || c === '`') quote = c;
        else if (c === '/' && linha[i + 1] === '/') return linha.slice(0, i);
      }
      return linha;
    })
    .join('\n');
}

/** Props cujo valor é lido pelo usuário. `className` e afins ficam de fora. */
const PROP_DE_COPY =
  /\b(label|placeholder|title|description|ariaLabel|aria-label|submitLabel|pendingLabel|intro|hint)="([^"\n]*)"/g;

function ocorrencias(caminho: string): string[] {
  const fonte = semComentarios(readFileSync(caminho, 'utf8'));
  const achados: string[] = [];

  // 1. Nó de texto JSX: `>texto<`
  for (const m of fonte.matchAll(/>([^<>{}]*)</g)) {
    const txt = m[1].trim();
    if (txt.length >= 3 && ACENTO.test(txt)) achados.push(txt);
  }
  // 2. Prop de copy com string literal
  for (const m of fonte.matchAll(PROP_DE_COPY)) {
    if (ACENTO.test(m[2])) achados.push(`${m[1]}="${m[2]}"`);
  }
  return achados;
}

describe('copy visível vem do dicionário, não do JSX', () => {
  const arquivos = arquivosFonte(RAIZ).filter(
    (c) => !FORA.some((f) => c.replace(/\\/g, '/').includes(f)),
  );

  it('varre um conjunto de arquivos que faz sentido', () => {
    // Se o filtro quebrar e a lista esvaziar, o teste passaria à toa.
    expect(arquivos.length).toBeGreaterThan(40);
  });

  it('nenhuma tela tem copy em português escrita direto no componente', () => {
    const soltas = arquivos.flatMap((caminho) =>
      ocorrencias(caminho).map(
        (txt) => `${caminho.slice(caminho.indexOf('src/'))}: ${txt.slice(0, 70)}`,
      ),
    );

    expect(soltas).toEqual([]);
  });
});
