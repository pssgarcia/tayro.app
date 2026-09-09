import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { applicationKeys, useCampaign } from '../../hooks/useCampaignApplications';
import { useCloseCampaign, useDeleteCampaign, usePublishCampaign } from '../../hooks/useCampaigns';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import type { Application, Campaign } from '../../types/api';
import { campaignStatusWord, daysUntil } from '../../utils/format';
import CampaignFilaTab from './CampaignFilaTab';
import CampaignOverviewTab from './CampaignOverviewTab';
import CampaignContentTab from './CampaignContentTab';
import CampaignRewardsTab from './CampaignRewardsTab';
import CampaignResultsTab from './CampaignResultsTab';
import KineticTabs from '../../components/primitives/kinetic/KineticTabs';
import KineticPlate from '../../components/primitives/kinetic/KineticPlate';
import KineticActions from '../../components/primitives/kinetic/KineticActions';
import { cn } from '../../lib/utils';
import { useT } from '../../i18n';

// ─── Abas ─────────────────────────────────────────────────────────────────────
// Renomeadas no redesign 2a: Candidaturas→Fila, Visão Geral→Briefing,
// Conteúdos→Entregas, Recompensas→Pagamento. Só a Fila muda de comportamento
// nesse passo — as outras três mantêm o conteúdo atual, só o rótulo muda.
//
// "Resultado" entrou por último e fecha o ciclo na ordem em que ele acontece:
// escolher (Fila) → combinar (Briefing) → receber (Entregas) → pagar
// (Pagamento) → informar o que deu (Resultado). O `KineticTabs` já rola na
// horizontal, que é o que faz 5 rótulos em mono caberem em 360px.

// Só os ids: o rótulo vem do dicionário no render.
const TAB_IDS = ['queue', 'briefing', 'content', 'payment', 'results'] as const;
const TAB_KEY = {
  queue: 'fila',
  briefing: 'briefing',
  content: 'entregas',
  payment: 'pagamento',
  results: 'resultado',
} as const;

type TabId = (typeof TAB_IDS)[number];

// ─── Header da campanha ───────────────────────────────────────────────────────

function CampaignHeader({
  title,
  deadline,
  spotsUsed,
  maxSpots,
  campaignId,
  status,
  onPublicar,
  onEncerrar,
  onApagar,
}: {
  title: string;
  deadline: string | null;
  spotsUsed: number;
  maxSpots: number;
  campaignId: string;
  status: Campaign['status'];
  onPublicar: () => void;
  onEncerrar: () => void;
  onApagar: () => void;
}) {
  const t = useT();
  const days = daysUntil(deadline);
  // Terminal = sem ação nenhuma (CLOSED/COMPLETED) — o rótulo de status ocupa
  // o espaço que a ação ocuparia, ao lado do título, pra a tela não ficar
  // muda sobre por que não há mais o que fazer aqui.
  const terminal = status === 'CLOSED' || status === 'COMPLETED';

  return (
    <div className="flex items-start justify-between gap-4 px-4 pb-6 pt-4 sm:px-6">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-[32px] font-bold leading-[.95] tracking-[-.05em] text-foreground sm:text-[46px]">
            {title}
          </h1>
          {terminal && (
            <span className="inline-flex shrink-0 items-center self-center border border-kinetic-border px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-kinetic-muted">
              {campaignStatusWord(status)}
            </span>
          )}
        </div>
        <p className="mt-3 font-mono text-[11px] uppercase tracking-widest text-kinetic-muted">
          {days === null ? t.app.format.semPrazo : t.app.marca.campanhas.encerraEm(days)}
        </p>
        {/* DRAFT tem três saídas. "Publicar" é a que faltava: sem ela, um
            rascunho salvo com "Agora não" no NewCampaignPage ficava preso em
            DRAFT pra sempre — o publish só existia naquele modal pós-criação.
            Vem em lime porque é a ação que destrava a campanha; apagar é a
            saída destrutiva e fica em ghost, como antes. */}
        {status === 'DRAFT' && (
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
            <button
              type="button"
              onClick={onPublicar}
              className="font-mono text-[10px] uppercase tracking-widest text-lime underline-offset-4 transition-opacity hover:underline hover:opacity-80"
            >
              {t.app.marca.detalhe.publicar}
            </button>
            <Link
              to={`/brand/campaigns/${campaignId}/edit`}
              className="font-mono text-[10px] uppercase tracking-widest text-kinetic-muted underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              {t.app.marca.detalhe.editar}
            </Link>
            <button
              type="button"
              onClick={onApagar}
              className="font-mono text-[10px] uppercase tracking-widest text-kinetic-muted underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              {t.app.marca.detalhe.apagarRascunho}
            </button>
          </div>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-3">
        {status === 'ACTIVE' && (
          <button
            type="button"
            onClick={onEncerrar}
            className="flex min-h-[38px] items-center border border-kinetic-border px-4 font-mono text-[10px] font-medium uppercase tracking-widest text-kinetic-text transition-colors hover:border-foreground hover:text-foreground"
          >
            {t.app.marca.detalhe.encerrar}
          </button>
        )}
        <p className="font-display text-[32px] font-bold leading-none tracking-[-.05em] tabular-nums text-foreground sm:text-[40px]">
          {spotsUsed}
          <span className="text-kinetic-muted">/{maxSpots}</span>
        </p>
      </div>
    </div>
  );
}

// ─── Modais de publicar/encerrar/apagar — mesmo padrão do PublishModal ────────

function PublishCampaignModal({
  campaignId,
  onClose,
}: {
  campaignId: string;
  onClose: () => void;
}) {
  const t = useT();
  const publish = usePublishCampaign();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="w-full sm:max-w-md">
        <KineticPlate marks="top" flush className="rounded-b-none sm:rounded-b-lg">
          <div className="px-6 pb-7 pt-11">
            <p className="font-display text-xl font-bold tracking-[-.04em] text-black">
              {t.app.marca.detalhe.publicarTitulo}
            </p>
            <p className="mt-3 text-[13px] leading-[1.5] text-[#6a6a64]">
              {t.app.marca.detalhe.publicarDescricao}
            </p>
            {publish.isError && (
              <p className="mt-3 text-[13px] text-destructive">
                {t.app.marca.detalhe.publicarErro}
              </p>
            )}
          </div>
          <KineticActions
            actions={[
              { label: t.app.acoes.cancelar, onClick: onClose, width: 130 },
              {
                label: publish.isPending ? t.app.marca.detalhe.publicando : t.app.marca.detalhe.publicarConfirmar,
                // Fecha só no sucesso: em erro o modal fica de pé pra dar retry,
                // em vez de sumir por baixo do usuário fingindo que aconteceu.
                onClick: () => publish.mutate(campaignId, { onSuccess: onClose }),
                disabled: publish.isPending,
                primary: true,
              },
            ]}
          />
        </KineticPlate>
      </div>
    </div>
  );
}

function CloseCampaignModal({ campaignId, onClose }: { campaignId: string; onClose: () => void }) {
  const t = useT();
  const close = useCloseCampaign();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="w-full sm:max-w-md">
        <KineticPlate marks="top" flush className="rounded-b-none sm:rounded-b-lg">
          <div className="px-6 pb-7 pt-11">
            <p className="font-display text-xl font-bold tracking-[-.04em] text-black">
              {t.app.marca.detalhe.encerrarTitulo}
            </p>
            <p className="mt-3 text-[13px] leading-[1.5] text-[#6a6a64]">
              {t.app.marca.detalhe.encerrarDescricao}
            </p>
          </div>
          <KineticActions
            actions={[
              { label: t.app.acoes.cancelar, onClick: onClose, width: 130 },
              {
                label: close.isPending ? t.app.marca.detalhe.encerrando : t.app.marca.detalhe.encerrarConfirmar,
                onClick: () => close.mutate(campaignId, { onSuccess: onClose }),
                disabled: close.isPending,
                primary: true,
              },
            ]}
          />
        </KineticPlate>
      </div>
    </div>
  );
}

function DeleteCampaignModal({ campaignId, onClose }: { campaignId: string; onClose: () => void }) {
  const t = useT();
  const navigate = useNavigate();
  const deleteCampaign = useDeleteCampaign();

  function handleDelete() {
    deleteCampaign.mutate(campaignId, {
      onSuccess: () => navigate('/brand/campaigns', { replace: true }),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="w-full sm:max-w-md">
        <KineticPlate marks="top" flush className="rounded-b-none sm:rounded-b-lg">
          <div className="px-6 pb-7 pt-11">
            <p className="font-display text-xl font-bold tracking-[-.04em] text-black">
              {t.app.marca.detalhe.apagarTitulo}
            </p>
            <p className="mt-3 text-[13px] leading-[1.5] text-[#6a6a64]">
              {t.app.marca.detalhe.apagarDescricao}
            </p>
            {deleteCampaign.isError && (
              <p className="mt-3 text-[13px] text-destructive">
                {t.app.marca.detalhe.apagarErro}
              </p>
            )}
          </div>
          <KineticActions
            actions={[
              { label: t.app.acoes.cancelar, onClick: onClose, width: 130 },
              {
                label: deleteCampaign.isPending ? t.app.marca.detalhe.apagando : t.app.marca.detalhe.apagarConfirmar,
                onClick: handleDelete,
                disabled: deleteCampaign.isPending,
                primary: true,
              },
            ]}
          />
        </KineticPlate>
      </div>
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function CampaignDetailPage() {
  const t = useT();
  const { id: campaignId = '' } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabId>('queue');
  const [openModal, setOpenModal] = useState<'publish' | 'close' | 'delete' | null>(null);

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
        campaignId={campaignId}
        status={campaign.status}
        onPublicar={() => setOpenModal('publish')}
        onEncerrar={() => setOpenModal('close')}
        onApagar={() => setOpenModal('delete')}
      />

      <KineticTabs
        tabs={TAB_IDS.map((id) => ({ id, label: t.app.marca.detalhe.abas[TAB_KEY[id]] }))}
        active={activeTab}
        onChange={setActiveTab}
      />

      <div
        className={cn(
          'min-h-0 flex-1 overflow-auto',
          activeTab === 'queue' ? 'px-4 pt-6 sm:px-6' : 'pt-8',
        )}
      >
        {activeTab === 'queue' && (
          <CampaignFilaTab
            campaign={campaign}
            campaignId={campaignId}
            onExitMobile={() => setActiveTab('briefing')}
          />
        )}
        {activeTab === 'briefing' && (
          <CampaignOverviewTab campaign={campaign} approvedCount={approvedCount} />
        )}
        {activeTab === 'content' && <CampaignContentTab campaignId={campaignId} />}
        {activeTab === 'payment' && <CampaignRewardsTab campaignId={campaignId} />}
        {activeTab === 'results' && <CampaignResultsTab campaignId={campaignId} />}
      </div>

      {openModal === 'publish' && (
        <PublishCampaignModal campaignId={campaignId} onClose={() => setOpenModal(null)} />
      )}
      {openModal === 'close' && (
        <CloseCampaignModal campaignId={campaignId} onClose={() => setOpenModal(null)} />
      )}
      {openModal === 'delete' && (
        <DeleteCampaignModal campaignId={campaignId} onClose={() => setOpenModal(null)} />
      )}
    </div>
  );
}
