import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Copy } from 'lucide-react';
import { useCreateCampaign, usePublishCampaign } from '../../hooks/useCampaigns';
import type { Campaign } from '../../types/api';
import Plate from '../../components/primitives/Plate';
import PlateActionBar from '../../components/primitives/PlateActionBar';
import CampaignForm from './CampaignForm';

// ─── Modal de publicação — placa-formulário, mesmo padrão do Login ───────────

function PublishModal({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  const navigate = useNavigate();
  const publish = usePublishCampaign();
  const applyUrl = `https://tayro.app/apply/${campaign.id}`;
  const [copied, setCopied] = useState(false);

  async function handlePublish() {
    await publish.mutateAsync(campaign.id);
    navigate(`/brand/campaigns/${campaign.id}`);
  }

  function handleCopy() {
    navigator.clipboard.writeText(applyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (publish.isSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
        <div className="w-full sm:max-w-md">
          <Plate marks="top" flush className="rounded-b-none sm:rounded-b-lg">
            <div className="px-6 pb-[26px] pt-[30px]">
              <p className="font-display text-d-lg text-plate-ink">Programa publicado</p>
              <p className="mt-5 text-[13px] leading-[1.5] text-plate-muted">
                Compartilhe o link abaixo para receber candidaturas.
              </p>
              <div className="mt-5 flex items-center gap-2.5 border-b border-[rgba(14,14,14,.18)] pb-[9px]">
                <span className="flex-1 truncate text-[13px] text-plate-muted">{applyUrl}</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="shrink-0 text-[#8A8A84] transition-colors hover:text-plate-ink"
                >
                  {copied ? <Check size={14} className="text-plate-ink" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
            <PlateActionBar
              primary={{
                label: 'Ver campanha',
                onClick: () => navigate(`/brand/campaigns/${campaign.id}`),
                icon: <ArrowRight size={16} />,
              }}
            />
          </Plate>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="w-full sm:max-w-md">
        <Plate marks="top" flush className="rounded-b-none sm:rounded-b-lg">
          <div className="px-6 pb-[26px] pt-[30px]">
            <p className="font-display text-d-xs text-plate-ink">Publicar agora?</p>
            {/* A copy antiga prometia "editar a qualquer momento" — mentira: o
                backend só aceita edição em DRAFT. Ficar em rascunho também não é
                beco sem saída (dá pra publicar depois, no detalhe do programa). */}
            <p className="mt-3 text-[13px] leading-[1.5] text-plate-muted">
              Ao publicar, o link de candidatura fica ativo na hora e creators já podem se
              inscrever. Depois de publicado o programa não volta para rascunho e os detalhes
              não podem mais ser editados — dá para publicar depois, pelo detalhe do programa.
            </p>
          </div>
          <PlateActionBar
            secondary={{ label: 'Agora não', onClick: onClose, width: 100 }}
            primary={{
              label: publish.isPending ? 'Publicando…' : 'Publicar',
              onClick: handlePublish,
              disabled: publish.isPending,
              icon: <ArrowRight size={16} />,
            }}
          />
        </Plate>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
// Tela 15 do redesign 2a, a última — e a mais longa. As 4 section com bg-card
// viram 2 seções tipográficas; a placa é a "Prévia da creator", montada ao
// vivo com watch() — é o que justifica a placa numa tela sem número herói, e
// a maior alavanca de conversão: a marca vê o resultado antes de publicar.
// O form em si vive em CampaignForm, compartilhado com a tela de edição.

export default function NewCampaignPage() {
  const navigate = useNavigate();
  const createCampaign = useCreateCampaign();
  const [createdCampaign, setCreatedCampaign] = useState<Campaign | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-[60px] items-center justify-between px-6">
        <span className="font-display text-[19px] font-bold tracking-[-.05em] text-foreground">
          tay<span className="text-lime">ro</span>
        </span>
        <Link
          to="/brand/campaigns"
          className="flex items-center gap-[7px] text-[13px] text-[#75756E] transition-colors hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Voltar
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-10">
        <h1 className="mb-[30px] font-display text-d-md text-foreground">Novo programa</h1>

        <CampaignForm
          onSubmit={async (payload) => {
            const campaign = await createCampaign.mutateAsync(payload);
            setCreatedCampaign(campaign);
          }}
          onCancel={() => navigate('/brand/campaigns')}
          isPending={createCampaign.isPending}
          submitLabel="Salvar rascunho"
          pendingLabel="Salvando…"
          errorMessage={
            createCampaign.isError
              ? 'Erro ao criar campanha. Verifique os campos e tente novamente.'
              : null
          }
        />
      </main>

      {createdCampaign && (
        <PublishModal
          campaign={createdCampaign}
          onClose={() => navigate(`/brand/campaigns/${createdCampaign.id}`)}
        />
      )}
    </div>
  );
}
