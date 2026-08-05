import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useCampaigns } from '../../hooks/useCampaigns';
import type { Campaign, CampaignStatus } from '../../types/api';
import CampaignCard from './CampaignCard';
import TabsUnderline from '../../components/primitives/TabsUnderline';

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
      <div className="h-[88px] rounded-lg bg-secondary" />
      <div className="space-y-[22px]">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-10 rounded bg-secondary" />
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
    <div className="mx-auto max-w-5xl px-6 pt-[14px]">
      <div className="mb-[22px] flex items-center justify-between">
        <h1 className="font-display text-d-md text-foreground">Programas</h1>
        <button
          onClick={() => navigate('/brand/campaigns/new')}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-lime px-[14px] py-[9px] font-display text-[13px] font-semibold tracking-[-.02em] text-lime transition-colors hover:bg-lime/10"
        >
          <Plus size={13} />
          Novo
        </button>
      </div>

      <TabsUnderline tabs={TABS} active={filter} onChange={setFilter} className="mb-[22px] px-0" />

      {isError && <p className="text-sm text-destructive">Erro ao carregar campanhas. Tente novamente.</p>}

      {isLoading && <Skeleton />}

      {!isLoading && !isError && campaigns?.length === 0 && (
        <p className="text-sm text-[#8A8A85]">
          Você ainda não criou nenhum programa. Crie o primeiro para começar a receber
          candidaturas.
        </p>
      )}

      {!isLoading && !isError && campaigns && campaigns.length > 0 && (
        <>
          {featured && <CampaignCard campaign={featured} variant="featured" />}

          {visible.length === 0 ? (
            <p className="mt-[30px] text-sm text-[#8A8A85]">
              Nenhum programa com status "{TABS.find((f) => f.id === filter)?.label}".
            </p>
          ) : (
            <div className="mt-[30px] flex flex-col gap-[22px]">
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
