import { cn } from '../../../lib/utils';

// Barra de progresso em segmentos, versão Kinetic: blocos RETOS (o
// `SegmentBar` do 2a usa `rounded-sm`) e cor derivada da superfície.

interface Props {
  filled: number;
  total?: number;
  /** 'plate' = sobre a placa clara; 'dark' = sobre o fundo do app. */
  tone?: 'dark' | 'plate';
  className?: string;
}

export default function KineticSegments({ filled, total = 7, tone = 'plate', className }: Props) {
  const onPlate = tone === 'plate';

  return (
    <div className={cn('flex gap-1', className)} role="img" aria-label={`${filled} de ${total}`}>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            'h-3.5 flex-1',
            i < filled
              ? onPlate
                ? 'bg-black'
                : 'bg-foreground'
              : onPlate
                ? 'bg-black/[.14]'
                : 'bg-kinetic-gray',
          )}
        />
      ))}
    </div>
  );
}
