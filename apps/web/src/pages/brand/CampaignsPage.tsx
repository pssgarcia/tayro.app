import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useCampaigns } from '../../hooks/useCampaigns';
import type { Campaign, CampaignStatus } from '../../types/api';
import CampaignCard from './CampaignCard';
import KineticTabs from '../../components/primitives/kinetic/KineticTabs';
import { useT } from '../../i18n';

type Filter = 'ALL' | CampaignStatus;

// Só os ids: o rótulo vem do dicionário no render.
const TAB_IDS = ['ALL', 'ACTIVE', 'DRAFT', 'CLOSED'] as const;

function applyFilter(campaigns: Campaign[], filter: Filter): Campaign[] {
  if (filter === 'ALL') return campaigns;
  return campaigns.filter((c) => c.status === filter);
}

/** Campanha ATIVA com maior taxa de preenchimento (aprovadas/vagas). */
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
// Tela 14 do redesign 2a. A campanha ativa mais cheia vira a placa em
// destaque. Ela só faz sentido em "Todas"/"Ativas" (ela É ativa, por
// definição) — em "Rascunho"/"Encerradas" some, senão parece uma campanha
// ativa vazando pra uma aba que só devia ter rascunho/encerrado (bug
// reportado: a placa aparecia em qualquer aba, sem relação com o filtro).

export default function CampaignsPage() {
  const t = useT();
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
          {t.app.marca.campanhas.titulo}
        </h1>
        <button
          onClick={() => navigate('/brand/campaigns/new')}
          className="flex min-h-[38px] shrink-0 items-center gap-2 border border-lime px-4 font-mono text-[10px] font-medium uppercase tracking-widest text-lime transition-colors hover:bg-lime hover:text-black"
        >
          <Plus size={12} />
          {t.app.marca.campanhas.nova}
        </button>
      </div>

      <div className="my-8 h-px bg-kinetic-gray lg:my-10" />

      <KineticTabs
        tabs={TAB_IDS.map((id) => ({ id: id as Filter, label: t.app.marca.campanhas.abas[id] }))}
        active={filter}
        onChange={setFilter}
        className="mb-8 px-0"
      />

      {isError && (
        <p className="text-sm text-destructive">{t.app.marca.campanhas.erro}</p>
      )}

      {isLoading && <Skeleton />}

      {!isLoading && !isError && campaigns?.length === 0 && (
        <p className="text-sm text-kinetic-muted">
          {t.app.marca.campanhas.vazio}
        </p>
      )}

      {!isLoading && !isError && campaigns && campaigns.length > 0 && (
        <>
          {featured && <CampaignCard campaign={featured} variant="featured" />}

          {visible.length === 0 ? (
            <p className="mt-8 text-sm text-kinetic-muted">
              {t.app.marca.campanhas.vazioComFiltro(t.app.marca.campanhas.abas[filter as keyof typeof t.app.marca.campanhas.abas])}
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
