import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
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
import { daysUntil } from '../../utils/format';
import ApplicationCard from './ApplicationCard';
import CampaignOverviewTab from './CampaignOverviewTab';
import CampaignContentTab from './CampaignContentTab';
import CampaignRewardsTab from './CampaignRewardsTab';
import TabsUnderline from '../../components/primitives/TabsUnderline';
import { cn } from '../../lib/utils';

// ─── Abas ─────────────────────────────────────────────────────────────────────
// Renomeadas no redesign 2a: Candidaturas→Fila, Visão Geral→Briefing,
// Conteúdos→Entregas, Recompensas→Pagamento. Só a Fila muda de comportamento
// nesse passo — as outras três mantêm o conteúdo atual, só o rótulo muda.

const TABS = [
  { id: 'queue', label: 'Fila' },
  { id: 'briefing', label: 'Briefing' },
  { id: 'content', label: 'Entregas' },
  { id: 'payment', label: 'Pagamento' },
] as const;

type TabId = (typeof TABS)[number]['id'];

// ─── Header da campanha ───────────────────────────────────────────────────────

function CampaignHeader({
  title,
  deadline,
  spotsUsed,
  maxSpots,
}: {
  title: string;
  deadline: string | null;
  spotsUsed: number;
  maxSpots: number;
}) {
  const days = daysUntil(deadline);

  return (
    <div className="flex items-end justify-between gap-3 px-6 pb-[22px] pt-2">
      <div>
        <h1 className="font-display text-d-sm text-foreground">{title}</h1>
        <p className="mt-[7px] text-xs text-[#6E6E68]">
          {days === null ? 'Sem prazo' : `Encerra em ${days} dias`}
        </p>
      </div>
      <p className="font-display text-d-inline leading-none text-foreground">
        {spotsUsed}
        <span className="text-[#6E6E68]">/{maxSpots}</span>
      </p>
    </div>
  );
}

// ─── Aba Fila — um candidato por vez, com pager (tela 2) ─────────────────────

const POLL_INTERVAL_MS = 6_000;
const POLL_TIMEOUT_MS = 45_000;

function QueueTab({ campaignId }: { campaignId: string }) {
  const [index, setIndex] = useState(0);
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const pollStartRef = useRef<number | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const { data: applications = [], isLoading } = useQuery({
    queryKey: applicationKeys.byCampaign(campaignId),
    queryFn: () =>
      api.get<Application[]>(`/applications/campaign/${campaignId}`).then((r) => r.data),
    enabled: !!campaignId,
    // Sem staleTime: uma candidatura nova precisa aparecer assim que a marca
    // volta pra aba. Com o padrão de 1 min do QueryClient, ela ficava fora da
    // fila até o cache vencer, dando a impressão de candidatura sumida.
    staleTime: 0,
    refetchInterval: (query) => {
      if (pollTimedOut) return false;
      const data = query.state.data as Application[] | undefined;
      return data?.some((a) => a.influencer.igFetchStatus === 'PENDING') ? POLL_INTERVAL_MS : false;
    },
  });

  // A fila é só o que ainda espera decisão — decidido sai da fila (regra 5:
  // a placa é o item que espera uma decisão). `index` pode ficar "velho" quando
  // aprovar/descartar encolhe a fila — clampa aqui, uma vez, e usa o resultado
  // em tudo (posição na placa, dot ativo do pager), nunca o `index` cru.
  const queue = applications.filter((a) => a.status === 'PENDING');
  const clampedIndex = Math.min(index, Math.max(queue.length - 1, 0));

  /** Arrastou: descobre em qual card o snap parou e sincroniza o pager. */
  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index && i >= 0 && i < queue.length) setIndex(i);
  }

  /** Clicou numa bolinha: leva o carrossel junto, senão o pager mente. */
  function goTo(i: number) {
    setIndex(i);
    const el = scrollerRef.current;
    if (!el) return;
    const left = i * el.clientWidth;
    // scrollTo nem sempre existe (jsdom, WebViews antigas); scrollLeft sim.
    if (typeof el.scrollTo === 'function') el.scrollTo({ left });
    else el.scrollLeft = left;
  }

  const hasPending = queue.some((a) => a.influencer.igFetchStatus === 'PENDING');

  if (!hasPending && pollTimedOut) {
    setPollTimedOut(false);
  }

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

  if (isLoading) {
    return <div className="h-[88px] animate-pulse rounded-lg bg-secondary" />;
  }

  if (queue.length === 0) {
    return <p className="text-sm text-[#8A8A85]">Nenhuma candidatura aguardando análise.</p>;
  }

  return (
    <div>
      {/* Arrastar é o gesto esperado pra percorrer a fila no mobile — o pager
          de bolinhas sozinho (2px de altura) não é alvo de toque viável. Todas
          as candidaturas ficam no DOM e o snap garante uma placa por vez, então
          a regra "uma placa por tela" continua valendo. */}
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="no-scrollbar -mx-6 flex snap-x snap-mandatory overflow-x-auto scroll-smooth"
      >
        {queue.map((app, i) => (
          <div key={app.id} className="w-full shrink-0 snap-center px-6">
            <ApplicationCard
              application={app}
              position={i + 1}
              onApprove={() => approve.mutate(app.id)}
              onReject={() => reject.mutate(app.id)}
              onRefreshIg={() => refreshIg.mutate(app.id)}
              isApproving={approve.isPending && approve.variables === app.id}
              isRejecting={reject.isPending && reject.variables === app.id}
              isRefreshingIg={refreshIg.isPending && refreshIg.variables === app.id}
              refreshIgError={refreshIg.variables === app.id ? refreshIg.error : null}
              igTimedOut={app.influencer.igFetchStatus === 'PENDING' && pollTimedOut}
            />
          </div>
        ))}
      </div>

      {queue.length > 1 && (
        <div className="mt-[22px] flex items-center justify-center">
          {queue.map((app, i) => (
            <button
              key={app.id}
              type="button"
              aria-label={`Candidato ${i + 1} de ${queue.length}`}
              aria-current={i === clampedIndex}
              onClick={() => goTo(i)}
              // Barra continua com 2px, mas o botão tem 24px de alvo de toque.
              className="group px-[3.5px] py-[11px]"
            >
              <span
                className={cn(
                  'block h-0.5 w-[22px] rounded-full transition-colors',
                  i === clampedIndex ? 'bg-lime' : 'bg-[#242422] group-hover:bg-[#3A3A38]',
                )}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function CampaignDetailPage() {
  const { id: campaignId = '' } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabId>('queue');

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
        deadline={campaign.deadline}
        spotsUsed={approvedCount}
        maxSpots={campaign.maxSpots}
      />

      <TabsUnderline tabs={TABS} active={activeTab} onChange={setActiveTab} />

      <div className={cn('flex-1 overflow-auto', activeTab === 'queue' ? 'px-6 pt-6' : 'p-4 md:p-6')}>
        {activeTab === 'queue' && <QueueTab campaignId={campaignId} />}
        {activeTab === 'briefing' && (
          <CampaignOverviewTab campaign={campaign} approvedCount={approvedCount} />
        )}
        {activeTab === 'content' && <CampaignContentTab campaignId={campaignId} />}
        {activeTab === 'payment' && <CampaignRewardsTab campaignId={campaignId} />}
      </div>
    </div>
  );
}
