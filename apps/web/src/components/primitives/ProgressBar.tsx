import { cn } from '../../lib/utils';

interface Props {
  value: number; // 0–100
  className?: string;
  trackClassName?: string;
  fillClassName?: string;
}

export default function ProgressBar({
  value,
  className,
  trackClassName,
  fillClassName,
}: Props) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-secondary', trackClassName)}>
        <div
          className={cn('h-full rounded-full bg-lime transition-all duration-300', fillClassName)}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
