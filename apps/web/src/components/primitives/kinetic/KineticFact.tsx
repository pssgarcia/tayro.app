import { cn } from '../../../lib/utils';

// Rótulo mono caixa alta + valor em TEXTO. Irmão do `StatFigure`, que existe
// pro mesmo par quando o valor é um número grande — aqui o valor é uma frase
// ("30 dias após aprovação", "Kit Whey 900g"), então não ganha escala de
// display, senão a linha quebra feio e rouba a hierarquia da placa.

interface Props {
  label: string;
  value: React.ReactNode;
  /** 'plate' = sobre a placa clara; 'dark' = sobre o fundo do app. */
  tone?: 'dark' | 'plate';
  className?: string;
}

export default function KineticFact({ label, value, tone = 'dark', className }: Props) {
  const onPlate = tone === 'plate';

  return (
    <div className={className}>
      <p
        className={cn(
          'mb-2 font-mono text-[10px] uppercase tracking-widest',
          onPlate ? 'text-[#6a6a64]' : 'text-kinetic-muted',
        )}
      >
        {label}
      </p>
      <p className={cn('text-sm leading-snug', onPlate ? 'text-black' : 'text-kinetic-text')}>
        {value}
      </p>
    </div>
  );
}
