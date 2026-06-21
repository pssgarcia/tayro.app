import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardList, Trophy } from 'lucide-react';
import { useMyApplications } from '../../hooks/useMyApplications';
import { useMyRewards } from '../../hooks/useMyRewards';
import type { ApplicationStatus, RewardStatus } from '../../types/api';
import { cn } from '../../lib/utils';

// ─── Status pills ──────────────────────────────────────────────────────────────

const APP_STATUS: Record<ApplicationStatus, { label: string; cls: string }> = {
  PENDING:   { label: 'Aguardando', cls: 'bg-amber-500/10 text-amber-400' },
  APPROVED:  { label: 'Aprovada',   cls: 'bg-lime/10 text-lime' },
  REJECTED:  { label: 'Recusada',   cls: 'bg-destructive/10 text-destructive' },
  WITHDRAWN: { label: 'Retirada',   cls: 'bg-secondary text-muted-foreground' },
};

const REWARD_STATUS: Record<RewardStatus, { label: string; cls: string }> = {
  PENDING:   { label: 'A receber', cls: 'bg-amber-500/10 text-amber-400' },
  ISSUED:    { label: 'A caminho', cls: 'bg-blue-500/10 text-blue-400' },
  DELIVERED: { label: 'Entregue',  cls: 'bg-lime/10 text-lime' },
};

function AppPill({ status }: { status: ApplicationStatus }) {
  const { label, cls } = APP_STATUS[status];
  return <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', cls)}>{label}</span>;
}

function RewardPill({ status }: { status: RewardStatus }) {
  const { label, cls } = REWARD_STATUS[status];
  return <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', cls)}>{label}</span>;
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 flex-1 rounded-xl border border-border bg-card" />
        ))}
      </div>
      <div className="space-y-3">
        <div className="h-4 w-32 rounded bg-secondary" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 rounded-xl border border-border bg-card" />
        ))}
      </div>
      <div className="space-y-3">
        <div className="h-4 w-40 rounded bg-secondary" />
        <div className="h-16 rounded-xl border border-border bg-card" />
      </div>
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: applications, isLoading: appsLoading } = useMyApplications();
  const { data: rewards, isLoading: rewardsLoading } = useMyRewards();

  const isLoading = appsLoading || rewardsLoading;

  const totalApps     = applications?.length ?? 0;
  const approvedApps  = applications?.filter((a) => a.status === 'APPROVED').length ?? 0;
  const pendingRewards = rewards?.filter((r) => r.status !== 'DELIVERED').length ?? 0;

  const recentApps   = applications?.slice(0, 4) ?? [];
  const activeRewards = rewards?.filter((r) => r.status !== 'DELIVERED') ?? [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6">
        <h1 className="font-display text-xl font-bold sm:text-2xl">Painel</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Resumo das suas atividades</p>
      </div>

      {isLoading ? (
        <Skeleton />
      ) : (
        <div className="space-y-8">
          {/* Stats */}
          <div className="flex gap-3">
            {(
              [
                { value: totalApps,      label: 'candidaturas', to: null },
                { value: approvedApps,   label: 'aprovadas',    to: null },
                { value: pendingRewards, label: 'a receber',    to: '/influencer/rewards' },
              ] as const
            ).map(({ value, label, to }) => {
              const inner = (
                <>
                  <p className="font-display text-2xl font-bold tabular-nums">{value}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
                </>
              );
              const cls = 'flex-1 rounded-xl border border-border bg-card p-4 text-center';
              return to ? (
                <Link key={label} to={to} className={cn(cls, 'transition-colors hover:border-lime/30')}>
                  {inner}
                </Link>
              ) : (
                <div key={label} className={cls}>{inner}</div>
              );
            })}
          </div>

          {/* Candidaturas recentes */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-sm font-semibold">
                <ClipboardList size={15} className="text-lime" />
                Últimas candidaturas
              </h2>
              {totalApps > 4 && (
                <Link
                  to="/influencer/applications"
                  className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  Ver todas <ArrowRight size={12} />
                </Link>
              )}
            </div>

            {recentApps.length === 0 ? (
              <div className="rounded-xl border border-border bg-card px-5 py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Nenhuma candidatura ainda.{' '}
                  <Link to="/influencer/browse" className="text-lime hover:underline">
                    Explore os programas
                  </Link>
                  .
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {recentApps.map((app) => (
                  <li
                    key={app.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{app.campaign.brand.name}</p>
                      <p className="truncate text-sm font-medium">{app.campaign.title}</p>
                    </div>
                    <AppPill status={app.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Recompensas a receber */}
          <section>
            <div className="mb-3">
              <h2 className="flex items-center gap-2 font-display text-sm font-semibold">
                <Trophy size={15} className="text-lime" />
                Recompensas a receber
              </h2>
            </div>

            {activeRewards.length === 0 ? (
              <div className="rounded-xl border border-border bg-card px-5 py-6 text-center">
                <p className="text-sm text-muted-foreground">Nenhuma recompensa pendente.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {activeRewards.map((reward) => (
                  <li
                    key={reward.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{reward.campaign.brand.name}</p>
                      <p className="truncate text-sm font-medium">{reward.campaign.title}</p>
                      <p className="mt-0.5 text-xs font-semibold text-lime">{reward.value}</p>
                    </div>
                    <RewardPill status={reward.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
