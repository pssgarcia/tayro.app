import { useNavigate } from 'react-router-dom';
import {
  Megaphone,
  Users,
  FileText,
  Gift,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { useDashboard } from '../../hooks/useDashboard';
import type { BrandDashboard } from '../../types/api';

// ─── Card de métrica ──────────────────────────────────────────────────────────

function MetricCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2 text-muted-foreground">
        <span className="text-lime">{icon}</span>
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="font-display text-3xl font-bold text-foreground tabular-nums">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ─── Card de "precisa de atenção" ─────────────────────────────────────────────

function AttentionCard({
  icon,
  count,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  count: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center justify-between rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-left transition-colors hover:bg-yellow-500/10"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-500/10 text-yellow-400">
          {icon}
        </span>
        <div>
          <p className="font-display text-lg font-bold text-foreground tabular-nums">
            {count}
          </p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
      <ArrowRight
        size={16}
        className="text-muted-foreground transition-transform group-hover:translate-x-0.5"
      />
    </button>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-border bg-card p-5 space-y-3"
        >
          <div className="h-3 w-20 rounded bg-secondary" />
          <div className="h-8 w-12 rounded bg-secondary" />
        </div>
      ))}
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useDashboard();

  const attentions = data ? buildAttentions(data) : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6">
        <h1 className="font-display text-xl font-bold sm:text-2xl">Dashboard</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Visão geral dos seus programas e parcerias
        </p>
      </div>

      {isError && (
        <p className="text-sm text-destructive">
          Erro ao carregar o dashboard. Tente novamente.
        </p>
      )}

      {isLoading && <DashboardSkeleton />}

      {!isLoading && !isError && data && (
        <div className="space-y-8">
          {/* Precisa de atenção */}
          {attentions.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <AlertCircle size={15} className="text-yellow-400" />
                Precisa de atenção
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {attentions.map((a) => (
                  <AttentionCard
                    key={a.label}
                    icon={a.icon}
                    count={a.count}
                    label={a.label}
                    onClick={() => navigate(a.to)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Métricas */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-foreground">Resumo</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                icon={<Megaphone size={16} />}
                label="Programas"
                value={data.campaigns.total}
                hint={`${data.campaigns.active} ativos · ${data.campaigns.draft} rascunho`}
              />
              <MetricCard
                icon={<Users size={16} />}
                label="Candidaturas"
                value={data.applications.total}
                hint={`${data.applications.approved} aprovadas`}
              />
              <MetricCard
                icon={<FileText size={16} />}
                label="Conteúdos"
                value={data.content.pendingReview}
                hint="aguardando revisão"
              />
              <MetricCard
                icon={<Gift size={16} />}
                label="Recompensas"
                value={data.rewards.total}
                hint={`${data.rewards.delivered} entregues`}
              />
            </div>
          </section>

          {/* Estado vazio amigável */}
          {data.campaigns.total === 0 && (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <p className="mb-3 text-sm text-muted-foreground">
                Você ainda não tem programas. Crie o primeiro para começar a receber
                candidaturas.
              </p>
              <button
                onClick={() => navigate('/brand/campaigns/new')}
                className="inline-flex items-center gap-2 rounded-lg bg-lime px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
              >
                Criar programa
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildAttentions(data: BrandDashboard) {
  const items: {
    label: string;
    count: number;
    icon: React.ReactNode;
    to: string;
  }[] = [];

  if (data.applications.pending > 0) {
    items.push({
      label: 'candidaturas aguardando análise',
      count: data.applications.pending,
      icon: <Clock size={16} />,
      to: '/brand/campaigns',
    });
  }
  if (data.content.pendingReview > 0) {
    items.push({
      label: 'conteúdos aguardando revisão',
      count: data.content.pendingReview,
      icon: <FileText size={16} />,
      to: '/brand/campaigns',
    });
  }
  if (data.rewards.pending > 0) {
    items.push({
      label: 'recompensas pendentes de emissão',
      count: data.rewards.pending,
      icon: <CheckCircle size={16} />,
      to: '/brand/campaigns',
    });
  }

  return items;
}
