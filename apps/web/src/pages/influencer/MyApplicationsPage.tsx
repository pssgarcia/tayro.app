import { useState } from 'react';
import { CalendarDays, Gift, ClipboardList, X } from 'lucide-react';
import {
  useMyApplications,
  useWithdrawApplication,
} from '../../hooks/useMyApplications';
import type { MyApplication, ApplicationStatus } from '../../types/api';
import Avatar from '../../components/primitives/Avatar';
import StatusPill from '../../components/primitives/StatusPill';
import EmptyState from '../../components/primitives/EmptyState';
import { formatOffer, formatDate } from '../../utils/format';
import { cn } from '../../lib/utils';

type Filter = 'ALL' | ApplicationStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'ALL', label: 'Todas' },
  { value: 'PENDING', label: 'Aguardando' },
  { value: 'APPROVED', label: 'Aprovadas' },
  { value: 'REJECTED', label: 'Recusadas' },
];

function ApplicationCard({
  application,
  onWithdraw,
  isWithdrawing,
}: {
  application: MyApplication;
  onWithdraw: () => void;
  isWithdrawing: boolean;
}) {
  const { campaign } = application;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      {/* Header: marca + status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar src={campaign.brand.logoUrl} name={campaign.brand.name} size="md" />
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-semibold text-foreground">
              {campaign.title}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {campaign.brand.name}
            </p>
          </div>
        </div>
        <StatusPill status={application.status} className="shrink-0" />
      </div>

      {/* Oferta + prazo */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Gift size={13} />
          {formatOffer(campaign)}
        </span>
        <span className="flex items-center gap-1.5">
          <CalendarDays size={13} />
          Candidatura {formatDate(application.appliedAt, '—')}
        </span>
      </div>

      {/* Ação: retirar (só PENDING) */}
      {application.status === 'PENDING' && (
        <div className="border-t border-border pt-3">
          <button
            onClick={onWithdraw}
            disabled={isWithdrawing}
            className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            <X size={13} />
            {isWithdrawing ? 'Retirando…' : 'Retirar candidatura'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function MyApplicationsPage() {
  const [filter, setFilter] = useState<Filter>('ALL');
  const { data: applications = [], isLoading, isError } = useMyApplications();
  const withdraw = useWithdrawApplication();

  const visible =
    filter === 'ALL'
      ? applications
      : applications.filter((a) => a.status === filter);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">Minhas candidaturas</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Acompanhe o status dos programas em que você se candidatou
        </p>
      </div>

      {/* Filtros */}
      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              filter === value
                ? 'border-lime/30 bg-lime/10 text-lime'
                : 'border-border text-muted-foreground hover:border-border/80 hover:text-foreground',
            )}
          >
            {label}
            {value === 'ALL' && (
              <span className="ml-1.5 tabular-nums text-muted-foreground">
                {applications.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {isError && (
        <p className="text-sm text-destructive">
          Erro ao carregar suas candidaturas. Tente novamente.
        </p>
      )}

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-xl border border-border bg-card"
            />
          ))}
        </div>
      )}

      {!isLoading && !isError && visible.length === 0 && (
        <EmptyState
          icon={<ClipboardList size={20} />}
          title={
            filter === 'ALL'
              ? 'Você ainda não se candidatou a nenhum programa'
              : 'Nenhuma candidatura com esse status'
          }
          description={
            filter === 'ALL'
              ? 'Quando você se candidatar a um programa, ele aparece aqui com o status atualizado.'
              : undefined
          }
        />
      )}

      {!isLoading && !isError && visible.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((app) => (
            <ApplicationCard
              key={app.id}
              application={app}
              onWithdraw={() => withdraw.mutate(app.id)}
              isWithdrawing={withdraw.isPending && withdraw.variables === app.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
