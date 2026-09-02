import { useState } from 'react';
import { Users, ExternalLink } from 'lucide-react';
import { useApprovedCreators } from '../../hooks/useApprovedCreators';
import EmptyState from '../../components/primitives/EmptyState';
import ThumbGrid from '../../components/primitives/ThumbGrid';
import WhatsAppIcon from '../../components/primitives/WhatsAppIcon';
import KineticPlate from '../../components/primitives/kinetic/KineticPlate';
import KineticRow from '../../components/primitives/kinetic/KineticRow';
import KineticActions from '../../components/primitives/kinetic/KineticActions';
import StatFigure from '../../components/primitives/kinetic/StatFigure';
import { creatorAvatarSrc, formatEngagement, whatsappLinkFromPhone } from '../../utils/format';
import type { ApprovedCreator } from '../../types/api';

// ─── Creators — visão agregada de aprovadas cross-campanha (specs/creator-roster) ──
// Fecha o gap que a Fila (por campanha) não resolve: depois de aprovar, a
// creator só era encontrável dentro da campanha específica em que foi
// aprovada. Mesmo par lista + placa já usado em Entregas/Fila. Reaproveita
// integralmente o media kit (avatar, seguidores, engajamento, posts) — não é
// uma tela nova de dado, é um recorte novo do mesmo dado.

function approvalsLabel(count: number): string {
  return count === 1 ? 'Aprovada em 1 campanha' : `Aprovada em ${count} campanhas`;
}

// ─── Placa: a creator selecionada ─────────────────────────────────────────────

function CreatorPlate({ creator }: { creator: ApprovedCreator }) {
  const { influencer, approvals } = creator;
  const handle = influencer.instagramHandle?.replace(/^@+/, '');
  const avatarSrc = creatorAvatarSrc(influencer);
  const waLink = whatsappLinkFromPhone(influencer.phone);

  return (
    <KineticPlate as="section" marks="all" flush ariaLabel="Media kit da creator">
      <div className="px-6 pb-8 pt-11 sm:px-8">
        {/* Sem ícone de WhatsApp aqui em cima: nesta página o contato JÁ é a
            ação principal da placa (barra "Falar no WhatsApp" na base) — um
            segundo ícone no cabeçalho seria a mesma ação duas vezes. O ícone
            no canto da placa é o reforço que faz sentido na Fila (onde
            aprovar/recusar são as ações principais e o contato é acessório) —
            ver CampaignFilaTab.tsx. */}
        <div className="mb-6 flex min-w-0 items-center gap-4">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded bg-gray-300">
            {avatarSrc && <img src={avatarSrc} alt="" className="h-full w-full object-cover" />}
          </div>
          <div className="min-w-0">
            <h2 className="truncate font-display text-2xl font-bold tracking-tight text-black">
              {influencer.name}
            </h2>
            {handle && (
              <a
                href={`https://instagram.com/${handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 flex w-fit items-center gap-1 font-mono text-sm text-gray-600 transition-colors hover:text-black"
              >
                @{handle}
                <ExternalLink size={12} className="shrink-0" />
              </a>
            )}
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-6 border-b border-gray-300 pb-6">
          {influencer.followersCount != null && (
            <StatFigure label="Seguidores" value={influencer.followersCount} tone="plate" />
          )}
          {influencer.igEngagementRate != null && (
            <StatFigure
              label="Engajamento"
              value={formatEngagement(influencer.igEngagementRate)}
              tone="plate"
            />
          )}
        </div>

        <div className="mb-6">
          <h3 className="mb-2 font-mono text-xs uppercase tracking-widest text-gray-500">
            {approvalsLabel(approvals.length)}
          </h3>
          <ul className="space-y-1">
            {approvals.map((a) => (
              <li key={a.applicationId} className="text-sm text-gray-800">
                {a.campaignTitle}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-3 font-mono text-xs uppercase tracking-widest text-gray-500">
            Posts recentes
          </h3>
          <ThumbGrid posts={influencer.igRecentPosts} influencerId={influencer.id} />
        </div>
      </div>

      {waLink && (
        <KineticActions
          actions={[
            {
              label: 'Falar no WhatsApp',
              href: waLink,
              icon: <WhatsAppIcon />,
              primary: true,
            },
          ]}
        />
      )}
    </KineticPlate>
  );
}

// ─── Página ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse px-4 pb-12 sm:px-6">
      <div className="h-8 w-64 rounded bg-kinetic-dark" />
      <div className="mt-8 flex flex-col gap-8 lg:flex-row">
        <div className="h-[420px] flex-1 rounded-lg bg-kinetic-dark" />
        <div className="w-full space-y-2 lg:w-[340px]">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 rounded bg-kinetic-dark" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ApprovedCreatorsPage() {
  const { data: creators = [], isLoading, isError } = useApprovedCreators();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = creators.find((c) => c.influencer.id === selectedId) ?? creators[0] ?? null;

  if (isLoading) return <Skeleton />;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-12 pt-6 sm:px-6 lg:pt-10">
      <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Creators
      </h1>
      <p className="mt-2 max-w-lg text-sm text-kinetic-muted">
        Todas as creators já aprovadas, em qualquer campanha, num lugar só.
      </p>

      <div className="my-8 h-px bg-kinetic-gray" />

      {isError && (
        <p className="text-sm text-destructive">Erro ao carregar as creators. Tente novamente.</p>
      )}

      {!isError && creators.length === 0 && (
        <EmptyState
          icon={<Users size={20} />}
          title="Nenhuma creator aprovada ainda"
          description="Aprove uma candidatura na Fila de alguma campanha para vê-la aqui."
        />
      )}

      {!isError && creators.length > 0 && (
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          {/* Lista primeiro no DOM: no celular ela fica acima da placa, então
              tocar numa linha atualiza uma placa que já está à vista. */}
          <aside className="w-full lg:order-2 lg:w-[340px] lg:shrink-0">
            <p className="mb-5 font-mono text-[11px] uppercase tracking-widest text-kinetic-muted">
              Creators · {creators.length}
            </p>
            <ul aria-label="Creators aprovadas" className="flex flex-col gap-0.5">
              {creators.map((creator) => {
                const rowAvatar = creatorAvatarSrc(creator.influencer);
                return (
                  <li key={creator.influencer.id}>
                    <KineticRow
                      title={creator.influencer.name}
                      meta={approvalsLabel(creator.approvals.length)}
                      selected={selected?.influencer.id === creator.influencer.id}
                      onClick={() => setSelectedId(creator.influencer.id)}
                      leading={
                        <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-kinetic-gray">
                          {rowAvatar && (
                            <img src={rowAvatar} alt="" className="h-full w-full object-cover" />
                          )}
                        </span>
                      }
                    />
                  </li>
                );
              })}
            </ul>
          </aside>

          <div className="min-w-0 flex-1 lg:order-1">
            {selected && <CreatorPlate creator={selected} />}
          </div>
        </div>
      )}
    </div>
  );
}
