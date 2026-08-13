import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useCampaign } from '../../hooks/useCampaignApplications';
import { useUpdateCampaign } from '../../hooks/useCampaigns';
import CampaignForm from './CampaignForm';
import { campaignToFormValues } from './campaignFormSchema';

// Editar programa (PATCH /campaigns/:id). O endpoint existia desde o começo e
// nunca teve tela — a marca criava um rascunho e não conseguia mais corrigir
// nem um typo do título (auditoria 2026-08-13).
//
// Só DRAFT é editável: é regra do backend (400 em ACTIVE/CLOSED), então a tela
// não tenta salvar o que a API vai recusar — mostra o motivo e devolve pro
// detalhe. Publicado é contrato com quem já se candidatou.

export default function EditCampaignPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: campaign, isLoading, isError } = useCampaign(id);
  const update = useUpdateCampaign();

  const backToDetail = () => navigate(`/brand/campaigns/${id}`);

  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-[60px] items-center justify-between px-6">
        <span className="font-display text-[19px] font-bold tracking-[-.05em] text-foreground">
          tay<span className="text-lime">ro</span>
        </span>
        <Link
          to={`/brand/campaigns/${id}`}
          className="flex items-center gap-[7px] text-[13px] text-[#75756E] transition-colors hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Voltar
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-10">
        <h1 className="mb-[30px] font-display text-d-md text-foreground">Editar programa</h1>

        {isLoading && (
          <div className="flex h-64 items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-lime border-t-transparent" />
          </div>
        )}

        {isError && (
          <p className="text-sm text-destructive">
            Não foi possível carregar o programa. Tente novamente.
          </p>
        )}

        {!isLoading && !isError && campaign && campaign.status !== 'DRAFT' && (
          <div className="max-w-[520px]">
            <p className="text-sm text-[#8A8A85]">
              Este programa já foi publicado e não pode mais ser editado. As creators que se
              candidataram viram estes termos — mudá-los agora quebraria o combinado.
            </p>
            <button
              type="button"
              onClick={backToDetail}
              className="mt-6 min-h-[52px] rounded-lg border border-[#232323] px-6 font-display text-[14px] font-medium tracking-[-.01em] text-[#75756E] transition-colors hover:text-foreground"
            >
              Voltar ao programa
            </button>
          </div>
        )}

        {!isLoading && !isError && campaign && campaign.status === 'DRAFT' && (
          <CampaignForm
            defaultValues={campaignToFormValues(campaign)}
            onSubmit={async (payload) => {
              await update.mutateAsync({ id, payload });
              backToDetail();
            }}
            onCancel={backToDetail}
            isPending={update.isPending}
            submitLabel="Salvar alterações"
            pendingLabel="Salvando…"
            errorMessage={
              update.isError
                ? 'Erro ao salvar as alterações. Verifique os campos e tente novamente.'
                : null
            }
          />
        )}
      </main>
    </div>
  );
}
