import { cn } from '../../lib/utils';
import type { ContentStatus } from '../../types/api';

// Mesma gramática visual do StatusPill (sólido nos estados fortes, outline no
// inerte) mas com o próprio mapeamento — ContentStatus não é ApplicationStatus:
// rótulos diferem (Aprovado, não Fechada) e PENDING aqui é outline/inerte (é a
// marca que precisa agir, não a creator), não sólido como em Application.

const config: Record<ContentStatus, { label: string; classes: string }> = {
  PENDING: { label: 'Análise', classes: 'border border-[#2A2A2A] text-muted-foreground' },
  APPROVED: { label: 'Aprovado', classes: 'bg-lime text-background' },
  REJECTED: { label: 'Recusado', classes: 'border border-destructive/40 text-destructive' },
  REVISION_REQUESTED: { label: 'Revisar', classes: 'bg-signal-wait text-background' },
};

interface Props {
  status: ContentStatus;
  className?: string;
}

export default function ContentStatusPill({ status, className }: Props) {
  const { label, classes } = config[status];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-[3px] px-2 py-[3px]',
        'font-mono text-[9px] uppercase tracking-[.1em]',
        classes,
        className,
      )}
    >
      {label}
    </span>
  );
}
