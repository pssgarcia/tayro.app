import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { usePublicCreatorProfile } from '../../hooks/usePublicCreatorProfile';
import type { PublicPartnershipResult } from '../../types/api';
import {
  creatorAvatarSrc,
  formatDate,
  formatEngagement,
  formatNumberParts,
  whatsappLinkFromPhone,
} from '../../utils/format';
import KineticPlate from '../../components/primitives/kinetic/KineticPlate';
import StatFigure from '../../components/primitives/kinetic/StatFigure';
import ThumbGrid from '../../components/primitives/ThumbGrid';
import WhatsAppIcon from '../../components/primitives/WhatsAppIcon';
import { useT } from '../../i18n';
import LanguageSwitcher from '../../components/LanguageSwitcher';

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="h-[220px] rounded-lg bg-kinetic-dark" />
      <div className="flex gap-3.5">
        <div className="h-[88px] flex-1 rounded-lg bg-kinetic-dark" />
        <div className="h-[88px] flex-1 rounded-lg bg-kinetic-dark" />
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
  const t = useT();
  if (status === 'PENDING' || status === null) {
    return (
      <div className="flex flex-1 animate-pulse gap-3.5">
        <div className="h-[88px] flex-1 rounded-lg bg-kinetic-dark" />
        <div className="h-[88px] flex-1 rounded-lg bg-kinetic-dark" />
      </div>
    );
  }

  if (status === 'FAILED' || followersCount == null) {
    return (
      <p className="flex flex-1 items-center text-xs text-muted-foreground">
        {t.app.publico.perfilCreator.igIndisponivel}
      </p>
    );
  }

  const followers = formatNumberParts(followersCount);

  return (
    <>
      <StatFigure
        label="seguidores"
        value={
          <>
            {followers.value}
            <span className="text-[20px]">{followers.suffix}</span>
          </>
        }
      />
      {igEngagementRate != null && (
        <StatFigure
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

// ─── Parceria do histórico ───────────────────────────────────────────────────
// Cada bloco é um resultado que a marca informou E liberou pra vitrine, e que
// a creator não escondeu. Os números vêm com o nome de quem os informou, nunca
// soltos: "alcance 12,4k" sem autor seria exatamente a métrica fabricada que a
// `vision.md` nº 5 proíbe. O tayro não mede nada disso e a página diz isso.

function PartnershipCard({ result }: { result: PublicPartnershipResult }) {
  const t = useT();
  const metrics = (
    [
      [t.app.publico.perfilCreator.alcance, result.reach],
      [t.app.publico.perfilCreator.impressoes, result.impressions],
      [t.app.publico.perfilCreator.cuponsUsados, result.couponsUsed],
    ] as const
  ).filter(([, value]) => value !== null);

  return (
    <article className="border border-kinetic-gray bg-kinetic-dark p-5">
      <p className="font-mono text-[10px] uppercase tracking-widest text-kinetic-muted">
        {result.brandName}
      </p>
      <p className="mt-2 font-display text-lg font-bold tracking-[-.035em] text-foreground">
        {result.campaignTitle}
      </p>

      {metrics.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-x-8 gap-y-4">
          {metrics.map(([label, value]) => {
            const { value: figure, suffix } = formatNumberParts(value as number);
            return (
              <StatFigure
                key={label}
                size="sm"
                label={label}
                value={
                  <>
                    {figure}
                    {suffix && <span className="text-base">{suffix}</span>}
                  </>
                }
              />
            );
          })}
        </div>
      )}

      {result.note && (
        <p className="mt-5 border-l-2 border-kinetic-gray pl-4 text-sm leading-relaxed text-kinetic-text">
          {result.note}
        </p>
      )}

      <p className="mt-5 font-mono text-[10px] uppercase tracking-widest text-kinetic-muted">
        Informado por {result.brandName} em {formatDate(result.createdAt, '—')}
      </p>
    </article>
  );
}

// ─── Página ──────────────────────────────────────────────────────────────────
// Media kit vivo — perfil público auto-gerado da creator (rota /c/:handle).
// Standalone, sem PublicLayout (mesmo padrão do PublicApplyPage): página
// isolada demais pra justificar um layout compartilhado ainda.

export default function PublicCreatorProfilePage() {
  const t = useT();
  const { handle } = useParams<{ handle: string }>();
  const navigate = useNavigate();

  const { data: profile, isLoading, isError } = usePublicCreatorProfile(handle);

  const igHandle = profile?.handle?.replace(/^@+/, '');
  const whatsappLink = whatsappLinkFromPhone(profile?.phone);
  const avatarSrc = profile ? creatorAvatarSrc(profile) : null;
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
          className="flex items-center gap-[7px] text-[13px] text-kinetic-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft size={14} />
          {t.app.acoes.voltar}
        </button>
        <LanguageSwitcher />
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-10 sm:px-6">
        {isLoading && <Skeleton />}

        {isError && (
          <div className="py-16 text-center">
            <p className="font-display font-semibold text-foreground">
              {t.app.publico.perfilCreator.indisponivel}
            </p>
            <p className="mt-1 text-sm text-kinetic-muted">
              {t.app.publico.perfilCreator.indisponivelDescricao}
            </p>
          </div>
        )}

        {profile && (
          <div className="max-w-[520px] pb-4">
            {/* Placa — identidade da creator (regra: uma placa por tela) */}
            <KineticPlate marks="all">
              <div className="flex items-start gap-4">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[4px] bg-[#cfcfc8]">
                  {avatarSrc ? (
                    <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center font-display text-[22px] font-semibold text-[#6a6a64]">
                      {initials || '?'}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1 pt-1">
                  <p className="truncate font-display text-[22px] font-bold leading-[1.05] tracking-[-.045em] text-black">
                    {profile.name}
                  </p>
                  {igHandle && (
                    <a
                      href={`https://instagram.com/${igHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-[7px] flex w-fit items-center gap-[5px] text-[13px] text-[#6a6a64] transition-colors hover:text-black"
                    >
                      @{igHandle}
                      <ExternalLink size={11} className="shrink-0" />
                    </a>
                  )}
                  {profile.city && (
                    <p className="mt-[6px] text-xs text-[#7a7a74]">{profile.city}</p>
                  )}
                </div>
              </div>

              {profile.niches.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-[7px]">
                  {profile.niches.map((n) => (
                    <span
                      key={n}
                      className="rounded-[3px] border border-[rgba(14,14,14,.16)] px-[9px] py-[5px] text-[11px] capitalize text-[#6a6a64]"
                    >
                      {n}
                    </span>
                  ))}
                </div>
              )}

              {profile.bio && (
                <p className="mt-5 whitespace-pre-line break-words text-sm leading-[1.55] text-[#3a3a34]">
                  {profile.bio}
                </p>
              )}
            </KineticPlate>

            {/* Stats — seguidores/engajamento (IG) + parcerias concluídas (histórico) */}
            <div className="mt-8 flex gap-3.5">
              <IgStats
                status={profile.igFetchStatus}
                followersCount={profile.followersCount}
                igEngagementRate={profile.igEngagementRate}
              />
              <StatFigure
                label={t.app.publico.perfilCreator.parceriasConcluidas}
                value={profile.completedPartnerships}
                highlight
                delay={240}
              />
            </div>

            {/* A regra de cálculo, dita em público. Não é rodapé legal: é o
                que separa "3 parcerias concluídas" de um número inventado
                (`vision.md` nº 5 — nada de métrica sem regra pública). Só
                aparece quando há o que explicar. */}
            {profile.completedPartnerships > 0 && (
              <p className="mt-4 text-xs leading-[1.5] text-kinetic-muted">
                {t.app.publico.perfilCreator.regraContagem}
              </p>
            )}

            {/* Histórico de parcerias — o diferencial nº 2 do produto. Vem
                ANTES do feed do Instagram de propósito: o feed qualquer perfil
                tem, isto só existe aqui. */}
            {profile.results.length > 0 && (
              <section aria-labelledby="historico-parcerias" className="mt-9">
                <h2
                  id="historico-parcerias"
                  className="mb-5 font-display text-base font-semibold tracking-[-.03em] text-foreground"
                >
                  {t.app.publico.perfilCreator.historico}
                </h2>
                <div className="flex flex-col gap-3">
                  {profile.results.map((result) => (
                    <PartnershipCard
                      key={`${result.brandName}-${result.createdAt}`}
                      result={result}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Conteúdo recente */}
            {profile.igRecentPosts && profile.igRecentPosts.length > 0 && (
              <>
                <h2 className="mb-5 mt-9 font-display text-base font-semibold tracking-[-.03em] text-foreground">
                  {t.app.publico.perfilCreator.conteudoRecente}
                </h2>
                <ThumbGrid posts={profile.igRecentPosts} influencerId={profile.id} />
              </>
            )}

            <div className="my-[30px] h-px bg-muted" />

            {/* O contato direto é a ação mais útil pra quem chegou aqui pelo
                link que a própria creator mandou. O telefone só chega nesta
                página com o perfil público ligado (privado é 404 uniforme);
                sem telefone cadastrado, o CTA segue sendo o de sempre. O
                "Crie sua campanha" não some: vira saída secundária. */}
            {whatsappLink ? (
              <>
                <p className="text-center text-sm text-kinetic-muted">
                  Fale direto com {profile.name}.
                </p>
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 flex min-h-[56px] w-full items-center justify-center gap-2 bg-lime font-mono text-[12px] font-medium uppercase tracking-widest text-black transition-colors hover:bg-white"
                >
                  <WhatsAppIcon size={16} />
                  {t.app.publico.perfilCreator.falarWhatsApp}
                </a>
                <Link
                  to="/register/brand"
                  className="mt-5 block text-center text-sm text-kinetic-muted underline-offset-2 transition-colors hover:text-foreground hover:underline"
                >
                  {t.app.publico.perfilCreator.crieCampanhaTitulo}
                </Link>
              </>
            ) : (
              <>
                <p className="text-center text-sm text-kinetic-muted">
                  Quer creators como {profile.name}?
                </p>
                <Link
                  to="/register/brand"
                  className="mt-5 flex min-h-[56px] w-full items-center justify-center bg-lime font-mono text-[12px] font-medium uppercase tracking-widest text-black transition-colors hover:bg-white"
                >
                  {t.app.publico.perfilCreator.crieCampanha}
                </Link>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
