import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone, Plus } from 'lucide-react';
import { useCampaigns } from '../../hooks/useCampaigns';
import type { Campaign, CampaignStatus } from '../../types/api';
import CampaignCard from './CampaignCard';
import EmptyState from '../../components/primitives/EmptyState';
import { cn } from '../../lib/utils';

type Filter = 'ALL' | CampaignStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'ALL', label: 'Todas' },
  { value: 'DRAFT', label: 'Rascunho' },
  { value: 'ACTIVE', label: 'Ativas' },
  { value: 'CLOSED', label: 'Encerradas' },
];

function CampaignCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex justify-between gap-3">
        <div className="h-4 w-2/3 rounded bg-secondary" />
        <div className="h-5 w-16 rounded-full bg-secondary" />
      </div>
      <div className="flex gap-1.5">
        <div className="h-4 w-14 rounded-full bg-secondary" />
        <div className="h-4 w-16 rounded-full bg-secondary" />
      </div>
      <div className="h-1.5 w-full rounded-full bg-secondary" />
      <div className="flex justify-between">
        <div className="h-3 w-24 rounded bg-secondary" />
        <div className="h-3 w-20 rounded bg-secondary" />
      </div>
    </div>
  );
}

function applyFilter(campaigns: Campaign[], filter: Filter): Campaign[] {
  if (filter === 'ALL') return campaigns;
  return campaigns.filter((c) => c.status === filter);
}

export default function CampaignsPage() {
  const navigate = useNavigate();
  const { data: campaigns, isLoading, isError } = useCampaigns();
  const [filter, setFilter] = useState<Filter>('ALL');

  const visible = campaigns ? applyFilter(campaigns, filter) : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold sm:text-2xl">Programas</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Gerencie suas campanhas e acompanhe candidaturas
          </p>
        </div>
        <button
          onClick={() => navigate('/brand/campaigns/new')}
          className="flex items-center gap-2 rounded-lg bg-lime px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
        >
          <Plus size={16} />
          Nova campanha
        </button>
      </div>

      {/* Filtros */}
      <div className="mb-6 flex gap-1 rounded-lg border border-border bg-card p-1 w-fit">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              filter === value
                ? 'bg-lime text-black'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
            {value !== 'ALL' && campaigns && (
              <span className="ml-1.5 text-[10px] opacity-70">
                ({campaigns.filter((c) => c.status === value).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      {isError && (
        <p className="text-sm text-destructive">Erro ao carregar campanhas. Tente novamente.</p>
      )}

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <CampaignCardSkeleton key={i} />
          ))}
        </div>
      )}

      {!isLoading && !isError && campaigns?.length === 0 && (
        <EmptyState
          icon={<Megaphone size={20} />}
          title="Você ainda não criou nenhum programa"
          description="Crie o primeiro para começar a receber candidatas e dar visibilidade à sua marca."
          action={
            <button
              onClick={() => navigate('/brand/campaigns/new')}
              className="flex items-center gap-2 rounded-lg bg-lime px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
            >
              <Plus size={16} />
              Criar programa
            </button>
          }
        />
      )}

      {!isLoading && !isError && campaigns && campaigns.length > 0 && visible.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhuma campanha com status "{FILTERS.find((f) => f.value === filter)?.label}".
        </p>
      )}

      {!isLoading && visible.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((c) => (
            <CampaignCard key={c.id} campaign={c} />
          ))}
        </div>
      )}
    </div>
  );
}
