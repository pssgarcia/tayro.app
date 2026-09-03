/**
 * Regra de copy (Pedro, 2026-09-03): o TAYRO não usa travessão (—) em texto
 * que o usuário lê. Nenhum lugar, nenhuma tela.
 *
 * Este teste existe porque regra que vive só no CLAUDE.md volta a ser quebrada
 * na sessão seguinte: 30 strings do produto tinham travessão quando a regra foi
 * criada, e o jeito de isso não voltar é falhar o CI.
 *
 * O que NÃO conta como texto do usuário:
 *  - comentario de codigo (barra-barra e bloco): e nota pra quem programa,
 *    nao copy;
 *  - o marcador de valor vazio: um `—` sozinho, que a placa da oferta e o
 *    dashboard usam no lugar de um número que não existe. É glifo de estado
 *    vazio, não pontuação de frase. Se algum dia isso também tiver que sair,
 *    é decisão de design do estado vazio, não desta regra.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = join(__dirname, 'src');

function arquivosFonte(dir: string): string[] {
  return readdirSync(dir).flatMap((nome: string): string[] => {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) return arquivosFonte(caminho);
    if (!/\.tsx?$/.test(nome)) return [];
    // Teste descreve comportamento em português corrente; não é copy de produto.
    if (nome.includes('.spec.')) return [];
    return [caminho];
  });
}

/**
 * Corta o comentário `//` de fim de linha, ignorando `//` que esteja DENTRO de
 * string (senão `'https://...'` viraria comentário e a copy da linha sumiria
 * do escrutínio). Por isso o rastreio de quotes em vez de um regex.
 */
function semComentarioDeLinha(linha: string): string {
  let quote: string | null = null;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') quote = c;
    else if (c === '/' && linha[i + 1] === '/') return linha.slice(0, i);
  }
  return linha;
}

/** Remove comentário de bloco, de bloco JSX e de linha. */
function semComentarios(fonte: string): string {
  return fonte
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '') // {/* ... */}
    .replace(/\/\*[\s\S]*?\*\//g, '') // /* ... */
    .split('\n')
    .map(semComentarioDeLinha)
    .join('\n');
}

/** Zera o marcador de vazio: '—' entre quotes ou como único texto de um nó JSX. */
function semMarcadorDeVazio(fonte: string): string {
  return fonte.replace(/(['"`])—\1/g, '$1$1').replace(/>\s*—\s*</g, '><');
}

describe('copy do produto não usa travessão', () => {
  const ocorrencias = arquivosFonte(RAIZ).flatMap((caminho) => {
    const limpo = semMarcadorDeVazio(semComentarios(readFileSync(caminho, 'utf8')));
    return limpo
      .split('\n')
      .map((linha: string, i: number) => ({ caminho, linha: i + 1, texto: linha.trim() }))
      .filter(({ texto }) => texto.includes('—'));
  });

  it('nenhum travessão em texto visível ao usuário', () => {
    const lista = ocorrencias.map(
      (o: { caminho: string; linha: number; texto: string }) => `${o.caminho.replace(RAIZ, 'src')}:${o.linha}: ${o.texto.slice(0, 90)}`,
    );
    expect(lista).toEqual([]);
  });

  // Garante que o próprio detector funciona: se ele parar de enxergar
  // travessão, o teste acima passaria por engano em vez de por mérito.
  it('o detector reconhece travessão em copy e ignora comentário e vazio', () => {
    const comCopy = 'const t = "Salvou — agora confira";';
    const soComentario = '// isto é comentário — não é copy';
    const comentarioNoFim = "const x = 1; // nota — só pra quem programa";
    const soVazio = "const vazio = '—';";
    // URL dentro de string não pode ser confundida com comentário: se fosse,
    // a copy depois dela escaparia da varredura.
    const urlEmString = 'const u = "https://x.com/a — veja";';

    expect(semMarcadorDeVazio(semComentarios(comCopy))).toContain('—');
    expect(semMarcadorDeVazio(semComentarios(soComentario))).not.toContain('—');
    expect(semMarcadorDeVazio(semComentarios(comentarioNoFim))).not.toContain('—');
    expect(semMarcadorDeVazio(semComentarios(soVazio))).not.toContain('—');
    expect(semMarcadorDeVazio(semComentarios(urlEmString))).toContain('—');
  });
});
