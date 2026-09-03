/**
 * Regra de copy (Pedro, 2026-09-03): o TAYRO não usa travessão (—) em texto que
 * o usuário lê. Aqui isso vale para o que a API devolve e envia: mensagem de
 * erro que aparece na tela, assunto e corpo de e-mail.
 *
 * Gêmeo do `apps/web/src/copy-sem-travessao.spec.ts`. São dois porque cada app
 * roda a própria suíte no CI: um guarda só no web deixaria a mensagem de erro
 * da API livre para reintroduzir o travessão.
 *
 * Comentário de código fica de fora: é nota para quem programa, não copy.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = join(__dirname, '..', '..');

function arquivosFonte(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) return arquivosFonte(caminho);
    if (!nome.endsWith('.ts')) return [];
    if (nome.includes('.spec.')) return [];
    return [caminho];
  });
}

/**
 * Corta `//` de fim de linha ignorando o que está dentro de string, senão
 * `'https://...'` viraria comentário e a copy seguinte escaparia da varredura.
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

function semComentarios(fonte: string): string {
  return fonte
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map(semComentarioDeLinha)
    .join('\n');
}

describe('copy da API não usa travessão', () => {
  it('nenhum travessão em mensagem de erro, assunto ou corpo de e-mail', () => {
    const ocorrencias = arquivosFonte(RAIZ).flatMap((caminho) =>
      semComentarios(readFileSync(caminho, 'utf8'))
        .split('\n')
        .map((linha, i) => ({ caminho, linha: i + 1, texto: linha.trim() }))
        .filter(({ texto }) => texto.includes('—'))
        .map(
          (o) =>
            `${o.caminho.replace(RAIZ, 'src')}:${o.linha}: ${o.texto.slice(0, 90)}`,
        ),
    );

    expect(ocorrencias).toEqual([]);
  });

  it('o detector reconhece travessão em copy e ignora comentário', () => {
    expect(
      semComentarios('throw new Error("Falhou — tente de novo");'),
    ).toContain('—');
    expect(semComentarios('// nota interna — não é copy')).not.toContain('—');
    expect(
      semComentarios('const x = 1; // nota — no fim da linha'),
    ).not.toContain('—');
    expect(semComentarios('const u = "https://x.com — veja";')).toContain('—');
  });
});
