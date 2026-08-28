import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Copy } from 'lucide-react';
import { useCreateCampaign, usePublishCampaign } from '../../hooks/useCampaigns';
import type { Campaign } from '../../types/api';
import { publicUrl } from '../../utils/format';
import KineticPlate from '../../components/primitives/kinetic/KineticPlate';
import KineticActions from '../../components/primitives/kinetic/KineticActions';
import CampaignForm from './CampaignForm';

// ─── Modal de publicação — placa-formulário, mesmo padrão do Login ───────────

function PublishModal({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  const navigate = useNavigate();
  const publish = usePublishCampaign();
  const applyUrl = publicUrl(`/apply/${campaign.id}`);
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
          <KineticPlate marks="top" flush className="rounded-b-none sm:rounded-b-lg">
            <div className="px-6 pb-[26px] pt-[30px]">
              <p className="font-display text-[34px] font-bold leading-[1.05] tracking-[-.05em] text-black">
                Programa publicado
              </p>
              <p className="mt-5 text-[13px] leading-[1.5] text-[#6a6a64]">
                Compartilhe o link abaixo para receber candidaturas.
              </p>
              <div className="mt-5 flex items-center gap-2.5 border-b border-[rgba(14,14,14,.18)] pb-[9px]">
                <span className="flex-1 truncate text-[13px] text-[#6a6a64]">{applyUrl}</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="shrink-0 text-[#8a8a84] transition-colors hover:text-black"
                >
                  {copied ? <Check size={14} className="text-black" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
            <KineticActions
              actions={[
                {
                  label: 'Ver campanha',
                  onClick: () => navigate(`/brand/campaigns/${campaign.id}`),
                  primary: true,
                },
              ]}
            />
          </KineticPlate>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="w-full sm:max-w-md">
        <KineticPlate marks="top" flush className="rounded-b-none sm:rounded-b-lg">
          <div className="px-6 pb-[26px] pt-[30px]">
            <p className="font-display text-xl font-bold tracking-[-.04em] text-black">
              Publicar agora?
            </p>
            {/* A copy antiga prometia "editar a qualquer momento" — mentira: o
                backend só aceita edição em DRAFT. E "agora não" deixou de ser
                beco sem saída: dá pra publicar depois, pelo detalhe. */}
            <p className="mt-3 text-[13px] leading-[1.5] text-[#6a6a64]">
              Ao publicar, o link de candidatura fica ativo na hora e creators já podem se
              inscrever. Depois de publicado o programa não volta para rascunho e os detalhes não
              podem mais ser editados — se preferir, publique depois, pelo detalhe do programa.
            </p>
          </div>
          <KineticActions
            actions={[
              { label: 'Agora não', onClick: onClose, width: 140 },
              {
                label: publish.isPending ? 'Publicando…' : 'Publicar',
                onClick: handlePublish,
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

// ─── Página principal ─────────────────────────────────────────────────────────
// Tela 15 do redesign 2a, a última — e a mais longa. As 4 section com bg-card
// viram 2 seções tipográficas; a placa é a "Prévia da oferta", montada ao
// vivo com watch() — é o que justifica a placa numa tela sem número herói, e
// a maior alavanca de conversão: a marca vê o resultado antes de publicar.
// O form em si vive em CampaignForm, compartilhado com a tela de edição.

export default function NewCampaignPage() {
  const navigate = useNavigate();
  const createCampaign = useCreateCampaign();
  const [createdCampaign, setCreatedCampaign] = useState<Campaign | null>(null);

  return (
    <div className="min-h-screen bg-background">
      {/* Logo escondido no mobile: o BrandLayout já mostra o logo + sair no
          header mobile — sem isso apareciam dois "tayro" empilhados. No
          desktop o BrandLayout só tem sidebar, então o logo aqui fica. */}
      <header className="flex h-[60px] items-center justify-between px-6">
        <span className="hidden font-display text-[19px] font-bold tracking-[-.05em] text-foreground md:inline-block">
          tay<span className="text-lime">ro</span>
        </span>
        <Link
          to="/brand/campaigns"
          className="ml-auto flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-kinetic-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Voltar
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-10">
        <h1 className="mb-9 font-display text-[36px] font-bold leading-[.95] tracking-[-.05em] text-foreground sm:text-[46px]">
          Novo programa
        </h1>

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
