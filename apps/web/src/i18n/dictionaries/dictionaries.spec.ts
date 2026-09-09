import { describe, it, expect } from 'vitest';
import { pt } from './pt';
import { en } from './en';

// ─── Paridade entre dicionários ──────────────────────────────────────────────
// O TypeScript já garante que `en` tem as mesmas CHAVES de `pt` (`satisfies
// Dictionary`). O que ele não vê é o conteúdo: uma chave nova copiada de `pt`
// pra `en` sem traduzir compila perfeitamente e vai pra produção mostrando
// português numa página em inglês. É esse buraco que este arquivo fecha.

type Node = string | ((...args: never[]) => string) | { [k: string]: Node } | Node[];

/** Caminha os dois dicionários em paralelo e devolve [caminho, ptValor, enValor]. */
function pares(a: Node, b: Node, caminho = ''): [string, unknown, unknown][] {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.flatMap((item, i) => pares(item, b[i] as Node, `${caminho}[${i}]`));
  }
  if (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null) {
    return Object.keys(a).flatMap((k) =>
      pares((a as Record<string, Node>)[k], (b as Record<string, Node>)[k], caminho ? `${caminho}.${k}` : k),
    );
  }
  return [[caminho, a, b]];
}

const TODOS = pares(pt as unknown as Node, en as unknown as Node);

describe('dicionários pt/en', () => {
  it('têm exatamente a mesma estrutura, incluindo o tamanho das listas', () => {
    // Se uma lista tiver tamanhos diferentes, o `pares` produz um lado
    // `undefined` — que é justamente o que esta asserção pega.
    const orfas = TODOS.filter(([, a, b]) => a === undefined || b === undefined);
    expect(orfas.map(([caminho]) => caminho)).toEqual([]);
  });

  it('não tem string vazia em nenhum dos dois', () => {
    const vazias = TODOS.filter(
      ([caminho, a, b]) =>
        // `hero.descricaoAntes` é vazio em inglês DE PROPÓSITO: em português a
        // frase começa com "O " antes do nome da marca, em inglês não começa
        // com nada. É a única exceção, e ela é explícita.
        caminho !== 'hero.descricaoAntes' &&
        ((typeof a === 'string' && a.trim() === '') || (typeof b === 'string' && b.trim() === '')),
    );
    expect(vazias.map(([caminho]) => caminho)).toEqual([]);
  });

  it('todo valor parametrizado é função nos DOIS idiomas', () => {
    const descasadas = TODOS.filter(([, a, b]) => typeof a !== typeof b);
    expect(descasadas.map(([caminho]) => caminho)).toEqual([]);
  });

  // O guarda principal: frase idêntica nos dois idiomas é quase sempre
  // copy-paste de `pt.ts` pra `en.ts` sem traduzir. Palavra curta pode
  // coincidir de verdade, então o corte é por tamanho — e ele foi calibrado
  // pelo maior par legítimo que existe hoje: "creators" (8). Acima disso,
  // igualdade é suspeita.
  it('nenhuma frase longa ficou por traduzir', () => {
    // Exceções EXPLÍCITAS, uma a uma com o motivo. A alternativa seria baixar o
    // corte até nenhuma passar, e aí o teste pararia de pegar o que importa.
    const IGUAIS_DE_PROPOSITO = new Set([
      // Nome próprio de exemplo: nome não se traduz.
      'app.cadastroCreator.nomePlaceholder',
      // Formato de telefone BRASILEIRO. O produto só atende telefone do Brasil
      // (o `whatsappLinkFromPhone` assume DDI 55), então mostrar um formato
      // americano no placeholder ensinaria a digitar errado.
      'app.cadastroCreator.telefonePlaceholder',
      // A palavra é a mesma nos dois idiomas.
      'app.nichos.lifestyle',
      // URL de exemplo.
      'app.creator.entregas.linkPlaceholder',
    ]);

    const iguais = TODOS.filter(
      ([caminho, a, b]) =>
        !IGUAIS_DE_PROPOSITO.has(caminho) &&
        typeof a === 'string' &&
        typeof b === 'string' &&
        a.length > 8 &&
        a === b,
    );
    expect(iguais.map(([caminho, a]) => `${caminho}: ${String(a)}`)).toEqual([]);
  });

  // Segundo guarda, complementar ao tamanho: o corte por comprimento não pega
  // frase curta esquecida ("o problema" tem 10, mas "de graça" teria 8). Um
  // acento português no dicionário inglês é sinal forte e sem falso positivo,
  // porque a copy em inglês não usa nenhum.
  it('o dicionário inglês não tem acentuação portuguesa', () => {
    const acentuadas = TODOS.filter(
      ([, , b]) => typeof b === 'string' && /[ãõçáéíóúâêôàÃÕÇÁÉÍÓÚÂÊÔÀ]/.test(b),
    );
    expect(acentuadas.map(([caminho, , b]) => `${caminho}: ${String(b)}`)).toEqual([]);
  });

  // Regra do produto (`CLAUDE.md` → Design system), aqui aplicada na fonte em
  // vez de só no DOM renderizado: pega também string que ainda não tem tela.
  it('não usa travessão em nenhum dos dois idiomas', () => {
    const comTravessao = TODOS.filter(
      ([, a, b]) =>
        (typeof a === 'string' && a.includes('—')) || (typeof b === 'string' && b.includes('—')),
    );
    expect(comTravessao.map(([caminho]) => caminho)).toEqual([]);
  });

  it('as funções devolvem string nos dois idiomas', () => {
    expect(pt.como.passo(1)).toBe('passo 01');
    expect(en.como.passo(1)).toBe('step 01');
    expect(pt.rodape.direitos(2026)).toContain('2026');
    expect(en.rodape.direitos(2026)).toContain('2026');
    expect(pt.story.progresso(2, 4)).toBe('2 de 4');
    expect(en.story.progresso(2, 4)).toBe('2 of 4');
  });
});
