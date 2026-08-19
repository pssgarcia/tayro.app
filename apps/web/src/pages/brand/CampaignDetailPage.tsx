import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { applicationKeys, useCampaign } from '../../hooks/useCampaignApplications';
import { useCloseCampaign, useDeleteCampaign, usePublishCampaign } from '../../hooks/useCampaigns';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import type { Application, Campaign } from '../../types/api';
import { daysUntil } from '../../utils/format';
import CampaignFilaTab from './CampaignFilaTab';
import CampaignOverviewTab from './CampaignOverviewTab';
import CampaignContentTab from './CampaignContentTab';
import CampaignRewardsTab from './CampaignRewardsTab';
import TabsUnderline from '../../components/primitives/TabsUnderline';
import Plate from '../../components/primitives/Plate';
import PlateActionBar from '../../components/primitives/PlateActionBar';
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
  const days = daysUntil(deadline);

  return (
    <div className="flex items-end justify-between gap-3 px-6 pb-[22px] pt-2">
      <div>
        <h1 className="font-display text-d-sm text-foreground">{title}</h1>
        <p className="mt-[7px] text-xs text-[#6E6E68]">
          {days === null ? 'Sem prazo' : `Encerra em ${days} dias`}
        </p>
        {/* Ação de gestão do status - só existe transição pra estado ativo/rascunho,
            CLOSED/COMPLETED não tem ação nenhuma (terminal). */}
        {status === 'ACTIVE' && (
          <button
            type="button"
            onClick={onEncerrar}
            className="mt-2 text-xs text-[#6E6E68] underline-offset-2 transition-colors hover:text-foreground hover:underline"
          >
            Encerrar campanha
          </button>
        )}
        {/* DRAFT tem três saídas. "Publicar" é a que faltava: sem ela, um
            rascunho salvo com "Agora não" no NewCampaignPage ficava preso em
            DRAFT pra sempre — o publish só existia naquele modal pós-criação.
            Vem em lime porque é a ação que destrava o programa; apagar é a
            saída destrutiva e fica em ghost, como antes. */}
        {status === 'DRAFT' && (
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
            <button
              type="button"
              onClick={onPublicar}
              className="text-xs font-semibold text-lime underline-offset-2 transition-opacity hover:underline hover:opacity-80"
            >
              Publicar programa
            </button>
            <Link
              to={`/brand/campaigns/${campaignId}/edit`}
              className="text-xs text-[#6E6E68] underline-offset-2 transition-colors hover:text-foreground hover:underline"
            >
              Editar
            </Link>
            <button
              type="button"
              onClick={onApagar}
              className="text-xs text-[#6E6E68] underline-offset-2 transition-colors hover:text-foreground hover:underline"
            >
              Apagar rascunho
            </button>
          </div>
        )}
      </div>
      <p className="font-display text-d-inline leading-none text-foreground">
        {spotsUsed}
        <span className="text-[#6E6E68]">/{maxSpots}</span>
      </p>
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
  const publish = usePublishCampaign();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="w-full sm:max-w-md">
        <Plate marks="top" flush className="rounded-b-none sm:rounded-b-lg">
          <div className="px-6 pb-[26px] pt-[30px]">
            <p className="font-display text-d-xs text-plate-ink">Publicar programa?</p>
            <p className="mt-3 text-[13px] leading-[1.5] text-plate-muted">
              O link de candidatura fica ativo na hora e creators já podem se inscrever. Depois de
              publicado o programa não volta para rascunho e os detalhes não podem mais ser
              editados.
            </p>
            {publish.isError && (
              <p className="mt-3 text-[13px] text-destructive">
                Não foi possível publicar. Tente novamente.
              </p>
            )}
          </div>
          <PlateActionBar
            secondary={{ label: 'Cancelar', onClick: onClose, width: 100 }}
            primary={{
              label: publish.isPending ? 'Publicando…' : 'Publicar',
              // Fecha só no sucesso: em erro o modal fica de pé pra dar retry,
              // em vez de sumir por baixo do usuário fingindo que aconteceu.
              onClick: () => publish.mutate(campaignId, { onSuccess: onClose }),
              disabled: publish.isPending,
              icon: <ArrowRight size={16} />,
            }}
          />
        </Plate>
      </div>
    </div>
  );
}

function CloseCampaignModal({
  campaignId,
  onClose,
}: {
  campaignId: string;
  onClose: () => void;
}) {
  const close = useCloseCampaign();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="w-full sm:max-w-md">
        <Plate marks="top" flush className="rounded-b-none sm:rounded-b-lg">
          <div className="px-6 pb-[26px] pt-[30px]">
            <p className="font-display text-d-xs text-plate-ink">Encerrar campanha?</p>
            <p className="mt-3 text-[13px] leading-[1.5] text-plate-muted">
              O link de candidatura deixa de aceitar novas inscrições na hora. Candidaturas e
              conteúdos já em andamento continuam visíveis, mas não será possível reabrir a
              campanha depois.
            </p>
          </div>
          <PlateActionBar
            secondary={{ label: 'Cancelar', onClick: onClose, width: 100 }}
            primary={{
              label: close.isPending ? 'Encerrando…' : 'Encerrar',
              onClick: () => close.mutate(campaignId, { onSuccess: onClose }),
              disabled: close.isPending,
              icon: <ArrowRight size={16} />,
            }}
          />
        </Plate>
      </div>
    </div>
  );
}

function DeleteCampaignModal({
  campaignId,
  onClose,
}: {
  campaignId: string;
  onClose: () => void;
}) {
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
        <Plate marks="top" flush className="rounded-b-none sm:rounded-b-lg">
          <div className="px-6 pb-[26px] pt-[30px]">
            <p className="font-display text-d-xs text-plate-ink">Apagar rascunho?</p>
            <p className="mt-3 text-[13px] leading-[1.5] text-plate-muted">
              O rascunho e todos os dados preenchidos somem pra sempre - não dá pra desfazer. Só é
              possível apagar campanhas que ainda não foram publicadas.
            </p>
            {deleteCampaign.isError && (
              <p className="mt-3 text-[13px] text-destructive">
                Não foi possível apagar. Tente novamente.
              </p>
            )}
          </div>
          <PlateActionBar
            secondary={{ label: 'Cancelar', onClick: onClose, width: 100 }}
            primary={{
              label: deleteCampaign.isPending ? 'Apagando…' : 'Apagar',
              onClick: handleDelete,
              disabled: deleteCampaign.isPending,
              icon: <ArrowRight size={16} />,
            }}
          />
        </Plate>
      </div>
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function CampaignDetailPage() {
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

      <TabsUnderline tabs={TABS} active={activeTab} onChange={setActiveTab} />

      <div
        className={cn(
          'min-h-0 flex-1 overflow-auto',
          activeTab === 'queue' ? 'px-6 pt-6' : 'p-4 md:p-6',
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
