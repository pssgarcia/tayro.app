import { cn } from '../../lib/utils';

interface Props {
  label: string;
  value: React.ReactNode;
  className?: string;
}

export default function StatBlock({ label, value, className }: Props) {
  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="font-display text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}
