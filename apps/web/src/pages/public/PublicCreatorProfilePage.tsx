import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { usePublicCreatorProfile } from '../../hooks/usePublicCreatorProfile';
import { formatEngagement, formatNumberParts } from '../../utils/format';
import Plate from '../../components/primitives/Plate';
import StatBlock from '../../components/primitives/StatBlock';
import ThumbGrid from '../../components/primitives/ThumbGrid';

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="h-[220px] rounded-lg bg-secondary" />
      <div className="flex gap-3.5">
        <div className="h-[88px] flex-1 rounded-lg bg-secondary" />
        <div className="h-[88px] flex-1 rounded-lg bg-secondary" />
      </div>
    </div>
  );
}

// ─── Bloco de seguidores/engajamento — sem ação de refresh (página pública) ──
// Ao contrário da placa de candidatura da marca, não há botão "Atualizar":
// o endpoint de sync é autenticado e não existe sessão de marca aqui.

function IgStats({
  status,
  followersCount,
  igEngagementRate,
}: {
  status: string | null;
  followersCount: number | null;
  igEngagementRate: number | null;
}) {
  if (status === 'PENDING' || status === null) {
    return (
      <div className="flex flex-1 animate-pulse gap-3.5">
        <div className="h-[88px] flex-1 rounded-lg bg-secondary" />
        <div className="h-[88px] flex-1 rounded-lg bg-secondary" />
      </div>
    );
  }

  if (status === 'FAILED' || followersCount == null) {
    return (
      <p className="flex flex-1 items-center text-xs text-muted-foreground">
        Dados do Instagram indisponíveis no momento.
      </p>
    );
  }

  const followers = formatNumberParts(followersCount);

  return (
    <>
      <StatBlock
        label="seguidores"
        value={
          <>
            {followers.value}
            <span className="text-[20px]">{followers.suffix}</span>
          </>
        }
      />
      {igEngagementRate != null && (
        <StatBlock
          label="engajamento"
          value={
            <>
              {formatEngagement(igEngagementRate).replace('%', '')}
              <span className="text-[20px]">%</span>
            </>
          }
          delay={120}
        />
      )}
    </>
  );
}

// ─── Página ──────────────────────────────────────────────────────────────────
// Media kit vivo — perfil público auto-gerado da creator (tayro.app/c/:handle).
// Standalone, sem PublicLayout (mesmo padrão do PublicApplyPage): página
// isolada demais pra justificar um layout compartilhado ainda.

export default function PublicCreatorProfilePage() {
  const { handle } = useParams<{ handle: string }>();
  const navigate = useNavigate();

  const { data: profile, isLoading, isError } = usePublicCreatorProfile(handle);

  const igHandle = profile?.handle?.replace(/^@+/, '');
  const avatarSrc = profile?.igProfilePicUrl
    ? `/api/v1/ig/avatar/${profile.id}`
    : profile?.avatarUrl;
  const initials = (profile?.name ?? '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-[60px] items-center justify-between px-4 sm:px-6">
        <Link
          to="/login"
          className="font-display text-[19px] font-bold tracking-[-.05em] text-foreground hover:opacity-80 transition-opacity"
        >
          tay<span className="text-lime">ro</span>
        </Link>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-[7px] text-[13px] text-[#75756E] transition-colors hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Voltar
        </button>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-10 sm:px-6">
        {isLoading && <Skeleton />}

        {isError && (
          <div className="py-16 text-center">
            <p className="font-display font-semibold text-foreground">
              Este perfil não está disponível
            </p>
            <p className="mt-1 text-sm text-[#75756E]">
              O link pode estar incorreto ou o perfil não é público.
            </p>
          </div>
        )}

        {profile && (
          <div className="max-w-[520px] pb-4">
            {/* Placa — identidade da creator (regra: uma placa por tela) */}
            <Plate marks="all">
              <div className="flex items-start gap-4">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[4px] bg-plate-fill">
                  {avatarSrc ? (
                    <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center font-display text-[22px] font-semibold text-plate-muted">
                      {initials || '?'}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1 pt-1">
                  <p className="truncate font-display text-[22px] font-bold leading-[1.05] tracking-[-.045em] text-plate-ink">
                    {profile.name}
                  </p>
                  {igHandle && (
                    <a
                      href={`https://instagram.com/${igHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-[7px] flex w-fit items-center gap-[5px] text-[13px] text-plate-muted transition-colors hover:text-plate-ink"
                    >
                      @{igHandle}
                      <ExternalLink size={11} className="shrink-0" />
                    </a>
                  )}
                  {profile.city && (
                    <p className="mt-[6px] text-xs text-plate-soft">{profile.city}</p>
                  )}
                </div>
              </div>

              {profile.niches.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-[7px]">
                  {profile.niches.map((n) => (
                    <span
                      key={n}
                      className="rounded-[3px] border border-[rgba(14,14,14,.16)] px-[9px] py-[5px] text-[11px] capitalize text-plate-muted"
                    >
                      {n}
                    </span>
                  ))}
                </div>
              )}

              {profile.bio && (
                <p className="mt-5 whitespace-pre-line break-words text-sm leading-[1.55] text-plate-body">
                  {profile.bio}
                </p>
              )}
            </Plate>

            {/* Stats — seguidores/engajamento (IG) + parcerias concluídas (histórico) */}
            <div className="mt-8 flex gap-3.5">
              <IgStats
                status={profile.igFetchStatus}
                followersCount={profile.followersCount}
                igEngagementRate={profile.igEngagementRate}
              />
              <StatBlock
                label="parcerias concluídas"
                value={profile.completedPartnerships}
                highlight
                delay={240}
              />
            </div>

            {/* Conteúdo recente */}
            {profile.igRecentPosts && profile.igRecentPosts.length > 0 && (
              <>
                <h2 className="mb-5 mt-9 font-display text-d-xs text-foreground">
                  Conteúdo recente
                </h2>
                <ThumbGrid posts={profile.igRecentPosts} />
              </>
            )}

            <div className="my-[30px] h-px bg-muted" />

            <p className="text-center text-sm text-[#8A8A85]">
              Quer creators como {profile.name}?
            </p>
            <Link
              to="/register/brand"
              className="mt-4 flex min-h-[52px] w-full items-center justify-center rounded-lg bg-lime text-[15px] font-semibold tracking-[-.02em] text-background transition-opacity hover:opacity-90"
            >
              Crie seu programa
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
