import { cn } from '../../../lib/utils';

// ─── Rótulo de seção da landing ──────────────────────────────────────────────
// Marca lime de 2px + título em Space Grotesk. Só isso.
//
// Duas versões ficaram pelo caminho: título em JetBrains Mono lime (ilegível —
// mono pequeno com tracking largo sobre fundo escuro) e um índice técnico
// ("01 / contexto") acima do título, que só somava ruído: a página tem quatro
// seções, ninguém precisa do número pra se localizar.
//
// A regra que continua valendo: o rótulo É o <h2>. O leitor de tela navega a
// página pelo outline de títulos, então rótulo de seção não pode ser <p> mudo.

interface Props {
  /** O título da seção — vira o <h2> e o alvo do `aria-labelledby`. */
  children: string;
  /** `id` do <h2>, referenciado pelo `aria-labelledby` da <section>. */
  id: string;
  /** Empilha centralizado em vez de alinhado à esquerda. */
  align?: 'left' | 'center';
  className?: string;
}

export default function SectionLabel({ children, id, align = 'left', className }: Props) {
  const centered = align === 'center';

  return (
    <div className={cn('flex flex-col', centered && 'items-center text-center', className)}>
      <span aria-hidden="true" className="mb-5 block h-[2px] w-8 bg-lime" />
      <h2
        id={id}
        className="text-balance font-display text-3xl font-bold tracking-[-.035em] text-foreground sm:text-4xl"
      >
        {children}
      </h2>
    </div>
  );
}
