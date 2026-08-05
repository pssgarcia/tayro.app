import { cn } from '../../lib/utils';

type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';
type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'COMPLETED';

type Status = ApplicationStatus | CampaignStatus;

// Fundo sólido nos dois estados que importam (Análise, Fechada/Ativa),
// outline puro no estado inerte — não bg-x/10 + border-x/20 (redesign 2a).
// Mono 9px/uppercase é um dos 3 usos de mono permitidos por tela (regra 1).
const config: Record<Status, { label: string; classes: string }> = {
  // Application statuses
  PENDING: {
    label: 'Análise',
    classes: 'bg-signal-wait text-background',
  },
  APPROVED: {
    label: 'Fechada',
    classes: 'bg-lime text-background',
  },
  REJECTED: {
    label: 'Recusada',
    classes: 'border border-destructive/40 text-destructive',
  },
  WITHDRAWN: {
    label: 'Retirada',
    classes: 'border border-[#2A2A2A] text-muted-foreground',
  },
  // Campaign statuses
  DRAFT: {
    label: 'Rascunho',
    classes: 'border border-[#2A2A2A] text-muted-foreground',
  },
  ACTIVE: {
    label: 'Ativa',
    classes: 'bg-lime text-background',
  },
  CLOSED: {
    label: 'Encerrada',
    classes: 'border border-[#2A2A2A] text-muted-foreground',
  },
  COMPLETED: {
    label: 'Concluída',
    classes: 'bg-plate text-plate-ink',
  },
};

interface Props {
  status: Status;
  className?: string;
}

export default function StatusPill({ status, className }: Props) {
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
