import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Users } from 'lucide-react';
import {
  applicationKeys,
  useApproveApplication,
  useCampaign,
  useRejectApplication,
  useRefreshApplicationIg,
} from '../../hooks/useCampaignApplications';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import type { Application } from '../../types/api';
import ApplicationCard from './ApplicationCard';
import CampaignOverviewTab from './CampaignOverviewTab';
import EmptyState from '../../components/primitives/EmptyState';
import ProgressBar from '../../components/primitives/ProgressBar';
import { cn } from '../../lib/utils';
import type { ApplicationStatus } from '../../types/api';

// ─── Abas ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'applications', label: 'Candidaturas' },
  { id: 'overview', label: 'Visão Geral' },
  { id: 'content', label: 'Conteúdos' },
  { id: 'rewards', label: 'Recompensas' },
] as const;

type TabId = (typeof TABS)[number]['id'];

// ─── Filtro de status ─────────────────────────────────────────────────────────

const STATUS_FILTERS: { value: 'ALL' | ApplicationStatus; label: string }[] = [
  { value: 'ALL', label: 'Todas' },
  { value: 'PENDING', label: 'Aguardando' },
  { value: 'APPROVED', label: 'Aprovadas' },
  { value: 'REJECTED', label: 'Recusadas' },
];

// ─── Header da campanha ───────────────────────────────────────────────────────

function CampaignHeader({
  title,
  spotsUsed,
  maxSpots,
  status,
}: {
  title: string;
  spotsUsed: number;
  maxSpots: number;
  status: string;
}) {
  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-lime/10 text-lime border-lime/20',
    DRAFT: 'bg-secondary text-muted-foreground border-border',
    CLOSED: 'bg-secondary text-muted-foreground border-border',
    COMPLETED: 'bg-secondary text-muted-foreground border-border',
  };
  const statusLabels: Record<string, string> = {
    ACTIVE: 'Ativo',
    DRAFT: 'Rascunho',
    CLOSED: 'Encerrado',
    COMPLETED: 'Concluído',
  };

  return (
    <div className="border-b border-border bg-card px-6 py-5">
      <h1 className="font-display text-2xl font-bold text-foreground">{title}</h1>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <span
          className={cn(
            'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
            statusColors[status] ?? statusColors.DRAFT,
          )}
        >
          {statusLabels[status] ?? status}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {spotsUsed}/{maxSpots} vagas preenchidas
          </span>
          <ProgressBar value={(spotsUsed / maxSpots) * 100} className="w-24" />
        </div>
      </div>
    </div>
  );
}

// ─── Tab bar ─────────────────────────────────────────────────────────────────

function TabBar({
  active,
  onChange,
}: {
  active: TabId;
  onChange: (id: TabId) => void;
}) {
  return (
    <div className="flex border-b border-border bg-card px-6">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'relative px-4 py-3 text-sm font-medium transition-colors',
            active === tab.id
              ? 'text-lime after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-lime'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ─── Aba Candidaturas ─────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 6_000;
const POLL_TIMEOUT_MS = 45_000;

function ApplicationsTab({ campaignId }: { campaignId: string }) {
  const [statusFilter, setStatusFilter] = useState<'ALL' | ApplicationStatus>('ALL');
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const pollStartRef = useRef<number | null>(null);

  const { data: applications = [], isLoading } = useQuery({
    queryKey: applicationKeys.byCampaign(campaignId),
    queryFn: () =>
      api.get<Application[]>(`/applications/campaign/${campaignId}`).then((r) => r.data),
    enabled: !!campaignId,
    // Refetch a cada 6s enquanto houver PENDING e o timeout não tiver estourado
    refetchInterval: (query) => {
      if (pollTimedOut) return false;
      const data = query.state.data as Application[] | undefined;
      return data?.some((a) => a.influencer.igFetchStatus === 'PENDING') ? POLL_INTERVAL_MS : false;
    },
  });

  const hasPending = applications.some((a) => a.influencer.igFetchStatus === 'PENDING');

  // Quando não há mais apps PENDING, zera o timeout durante o render — padrão
  // recomendado pelo React para ajustar estado quando um valor derivado muda
  // (https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes).
  if (!hasPending && pollTimedOut) {
    setPollTimedOut(false);
  }

  // Inicia timer de 45s quando aparecem apps PENDING; para quando somem
  useEffect(() => {
    if (!hasPending) {
      pollStartRef.current = null;
      return;
    }
    if (pollTimedOut) return;

    if (!pollStartRef.current) pollStartRef.current = Date.now();
    const remaining = POLL_TIMEOUT_MS - (Date.now() - pollStartRef.current);
    if (remaining <= 0) {
      setPollTimedOut(true);
      return;
    }

    const timer = setTimeout(() => setPollTimedOut(true), remaining);
    return () => clearTimeout(timer);
  }, [hasPending, pollTimedOut]);

  const approve = useApproveApplication(campaignId);
  const reject = useRejectApplication(campaignId);
  const refreshIg = useRefreshApplicationIg(campaignId);

  const filtered =
    statusFilter === 'ALL'
      ? applications
      : applications.filter((a) => a.status === statusFilter);

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-border bg-card p-5 space-y-4"
          >
            <div className="flex gap-4">
              <div className="h-14 w-14 rounded-full bg-secondary" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-4 w-32 rounded bg-secondary" />
                <div className="h-3 w-24 rounded bg-secondary" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full rounded bg-secondary" />
              <div className="h-3 w-3/4 rounded bg-secondary" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Filtro de status */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setStatusFilter(value)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              statusFilter === value
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

      {/* Lista ou empty state */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users size={20} />}
          title={
            statusFilter === 'ALL'
              ? 'Nenhuma candidatura ainda'
              : 'Nenhuma candidatura com esse status'
          }
          description={
            statusFilter === 'ALL'
              ? 'Compartilhe o link do programa para receber as primeiras candidaturas.'
              : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((app) => (
            <ApplicationCard
              key={app.id}
              application={app}
              onApprove={() => approve.mutate(app.id)}
              onReject={() => reject.mutate(app.id)}
              onRefreshIg={() => refreshIg.mutate(app.id)}
              isApproving={approve.isPending && approve.variables === app.id}
              isRejecting={reject.isPending && reject.variables === app.id}
              isRefreshingIg={refreshIg.isPending && refreshIg.variables === app.id}
              refreshIgError={refreshIg.variables === app.id ? refreshIg.error : null}
              igTimedOut={app.influencer.igFetchStatus === 'PENDING' && pollTimedOut}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Placeholder para abas futuras ────────────────────────────────────────────

function TabPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border">
      <p className="text-sm text-muted-foreground">{label} — em breve</p>
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function CampaignDetailPage() {
  const { id: campaignId = '' } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabId>('applications');

  const { data: campaign, isLoading: campaignLoading } = useCampaign(campaignId);

  // Conta aprovadas em tempo real a partir da lista; fallback para _count do backend
  // enquanto as candidaturas ainda não carregaram
  const { data: applications = [] } = useQuery({
    queryKey: applicationKeys.byCampaign(campaignId),
    queryFn: () =>
      api.get<Application[]>(`/applications/campaign/${campaignId}`).then((r) => r.data),
    enabled: !!campaignId,
  });
  const approvedCount =
    applications.length > 0
      ? applications.filter((a) => a.status === 'APPROVED').length
      : (campaign?._count.applications ?? 0);

  if (campaignLoading || !campaign) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-lime border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <CampaignHeader
        title={campaign.title}
        spotsUsed={approvedCount}
        maxSpots={campaign.maxSpots}
        status={campaign.status}
      />

      <TabBar active={activeTab} onChange={setActiveTab} />

      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'applications' && (
          <ApplicationsTab campaignId={campaignId} />
        )}
        {activeTab === 'overview' && (
          <CampaignOverviewTab
            campaign={campaign}
            approvedCount={approvedCount}
          />
        )}
        {activeTab === 'content' && <TabPlaceholder label="Conteúdos" />}
        {activeTab === 'rewards' && <TabPlaceholder label="Recompensas" />}
      </div>
    </div>
  );
}
