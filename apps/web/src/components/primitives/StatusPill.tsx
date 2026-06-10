import { cn } from '../../lib/utils';

type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';
type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'COMPLETED';

type Status = ApplicationStatus | CampaignStatus;

const config: Record<Status, { label: string; classes: string }> = {
  // Application statuses
  PENDING: {
    label: 'Aguardando',
    classes: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  },
  APPROVED: {
    label: 'Aprovada',
    classes: 'bg-lime/10 text-lime border-lime/20',
  },
  REJECTED: {
    label: 'Recusada',
    classes: 'bg-destructive/10 text-destructive border-destructive/20',
  },
  WITHDRAWN: {
    label: 'Retirada',
    classes: 'bg-muted text-muted-foreground border-border',
  },
  // Campaign statuses
  DRAFT: {
    label: 'Rascunho',
    classes: 'bg-muted text-muted-foreground border-border',
  },
  ACTIVE: {
    label: 'Ativa',
    classes: 'bg-lime/10 text-lime border-lime/20',
  },
  CLOSED: {
    label: 'Encerrada',
    classes: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  },
  COMPLETED: {
    label: 'Concluída',
    classes: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
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
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        classes,
        className,
      )}
    >
      {label}
    </span>
  );
}
