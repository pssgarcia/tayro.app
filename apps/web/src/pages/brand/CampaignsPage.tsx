import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useCampaigns } from '../../hooks/useCampaigns';
import type { Campaign, CampaignStatus } from '../../types/api';
import CampaignCard from './CampaignCard';
import KineticTabs from '../../components/primitives/kinetic/KineticTabs';

type Filter = 'ALL' | CampaignStatus;

const TABS: { id: Filter; label: string }[] = [
  { id: 'ALL', label: 'Todas' },
  { id: 'ACTIVE', label: 'Ativas' },
  { id: 'DRAFT', label: 'Rascunho' },
  { id: 'CLOSED', label: 'Encerradas' },
];

function applyFilter(campaigns: Campaign[], filter: Filter): Campaign[] {
  if (filter === 'ALL') return campaigns;
  return campaigns.filter((c) => c.status === filter);
}

/** Programa ATIVO com maior taxa de preenchimento (aprovadas/vagas). */
function pickFeatured(campaigns: Campaign[]): Campaign | null {
  const active = campaigns.filter((c) => c.status === 'ACTIVE');
  if (active.length === 0) return null;
  return active.reduce((best, c) => {
    const rate = (c.approvedCount ?? 0) / c.maxSpots;
    const bestRate = (best.approvedCount ?? 0) / best.maxSpots;
    return rate > bestRate ? c : best;
  }, active[0]);
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="h-[240px] max-w-[560px] rounded-lg bg-kinetic-dark" />
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-14 rounded bg-kinetic-dark" />
        ))}
      </div>
    </div>
  );
}

// ─── Página ──────────────────────────────────────────────────────────────────
// Tela 14 do redesign 2a. O programa ativo mais cheio vira a placa em
// destaque. Ela só faz sentido em "Todas"/"Ativas" (ela É ativa, por
// definição) — em "Rascunho"/"Encerradas" some, senão parece um programa
// ativo vazando pra uma aba que só devia ter rascunho/encerrado (bug
// reportado: a placa aparecia em qualquer aba, sem relação com o filtro).

export default function CampaignsPage() {
  const navigate = useNavigate();
  const { data: campaigns, isLoading, isError } = useCampaigns();
  const [filter, setFilter] = useState<Filter>('ALL');

  const visible = campaigns ? applyFilter(campaigns, filter) : [];
  const showFeatured = filter === 'ALL' || filter === 'ACTIVE';
  const featured = campaigns && showFeatured ? pickFeatured(campaigns) : null;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-12 pt-6 sm:px-6 lg:pt-10">
      <div className="flex items-end justify-between gap-4">
        <h1 className="font-display text-[42px] font-bold leading-[.9] tracking-[-.055em] text-foreground sm:text-[56px] lg:text-[72px]">
          Programas
        </h1>
        <button
          onClick={() => navigate('/brand/campaigns/new')}
          className="flex min-h-[38px] shrink-0 items-center gap-2 border border-lime px-4 font-mono text-[10px] font-medium uppercase tracking-widest text-lime transition-colors hover:bg-lime hover:text-black"
        >
          <Plus size={12} />
          Novo
        </button>
      </div>

      <div className="my-8 h-px bg-kinetic-gray lg:my-10" />

      <KineticTabs tabs={TABS} active={filter} onChange={setFilter} className="mb-8 px-0" />

      {isError && (
        <p className="text-sm text-destructive">Erro ao carregar campanhas. Tente novamente.</p>
      )}

      {isLoading && <Skeleton />}

      {!isLoading && !isError && campaigns?.length === 0 && (
        <p className="text-sm text-kinetic-muted">
          Você ainda não criou nenhum programa. Crie o primeiro para começar a receber candidaturas.
        </p>
      )}

      {!isLoading && !isError && campaigns && campaigns.length > 0 && (
        <>
          {featured && <CampaignCard campaign={featured} variant="featured" />}

          {visible.length === 0 ? (
            <p className="mt-8 text-sm text-kinetic-muted">
              Nenhum programa com status "{TABS.find((f) => f.id === filter)?.label}".
            </p>
          ) : (
            <div className="mt-8 flex flex-col gap-0.5">
              {visible.map((c, i) => (
                <CampaignCard key={c.id} campaign={c} variant="row" index={i + 1} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
