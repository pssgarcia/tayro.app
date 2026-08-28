import CountUp from '../CountUp';
import { cn } from '../../../lib/utils';

// ─── Número com rótulo (Kinetic) ─────────────────────────────────────────────
// Rótulo mono caixa alta EM CIMA, número grande embaixo — a ordem da Fila
// ("Seguidores" / "Engajamento" sobre o número). É a inversão do `StatBlock`
// do 2a, que põe o número primeiro e o rótulo em Inter embaixo.
//
// O rótulo é escrito em minúsculas no JSX e sobe pra caixa alta via CSS
// (`uppercase`) de propósito: o texto no DOM continua sendo o que a pessoa
// escreveu, então busca por texto em teste e leitor de tela não mudam.

type Size = 'sm' | 'md' | 'lg' | 'hero';

const sizeClasses: Record<Size, string> = {
  sm: 'text-2xl',
  md: 'text-4xl',
  lg: 'text-5xl',
  // Herói encolhe no celular — 96px estoura numa viewport de 360.
  hero: 'text-[72px] leading-[.78] min-[380px]:text-[96px]',
};

interface Props {
  label: string;
  value: React.ReactNode;
  /** Linha de apoio abaixo do número (ex: "programas · 3 ativos"). */
  sub?: React.ReactNode;
  size?: Size;
  /** 'plate' = sobre a placa clara; 'dark' = sobre o fundo do app. */
  tone?: 'dark' | 'plate';
  /** Destaque em lime — usar no máximo uma vez por tela. */
  highlight?: boolean;
  /** Atraso da animação de contagem, em ms. */
  delay?: number;
  className?: string;
}

export default function StatFigure({
  label,
  value,
  sub,
  size = 'md',
  tone = 'dark',
  highlight,
  delay,
  className,
}: Props) {
  const onPlate = tone === 'plate';

  return (
    <div className={className}>
      <p
        className={cn(
          'mb-3 font-mono text-[11px] uppercase tracking-widest',
          highlight ? 'text-lime' : onPlate ? 'text-[#6a6a64]' : 'text-kinetic-muted',
        )}
      >
        {label}
      </p>
      <CountUp delay={delay}>
        <span
          className={cn(
            'block font-display font-bold tabular-nums tracking-[-.05em]',
            sizeClasses[size],
            highlight ? 'text-lime' : onPlate ? 'text-black' : 'text-foreground',
          )}
        >
          {value}
        </span>
      </CountUp>
      {sub && (
        <p className={cn('mt-3 text-xs', onPlate ? 'text-[#7a7a74]' : 'text-kinetic-muted')}>
          {sub}
        </p>
      )}
    </div>
  );
}
