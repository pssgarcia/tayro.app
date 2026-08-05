import { cn } from '../../lib/utils';

interface Props {
  /** Segmentos preenchidos. */
  filled: number;
  /** Total de segmentos. Default 7. */
  total?: number;
  className?: string;
}

export default function SegmentBar({ filled, total = 7, className }: Props) {
  return (
    <div
      className={cn('flex gap-1', className)}
      role="img"
      aria-label={`${filled} de ${total}`}
    >
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn('h-3.5 flex-1 rounded-sm', i < filled ? 'bg-plate-ink' : 'bg-plate-ink/[.14]')}
        />
      ))}
    </div>
  );
}
