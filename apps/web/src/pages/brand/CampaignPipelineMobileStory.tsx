import { useMemo, useRef, useState } from 'react';
import { ChevronUp, MapPin, RefreshCw, X } from 'lucide-react';
import {
  extractCooldownWait,
  useApproveApplication,
  useRefreshApplicationIg,
  useRejectApplication,
} from '../../hooks/useCampaignApplications';
import { formatEngagement, formatNumberParts, formatOffer } from '../../utils/format';
import { cn } from '../../lib/utils';
import type { Application, Campaign } from '../../types/api';

// ─── Mobile: revisão em formato Story ─────────────────────────────────────────
// NÃO é o desktop espremido — fluxo próprio pra celular, um candidato por vez
// em tela cheia, navegação por toque/arraste (pedido explícito do Pedro:
// "Instagram Stories + revisão de creator premium + identidade Kinetic
// Editorial", desktop fica exatamente como está). Só a fila PENDING entra
// aqui — mesmo recorte da aba "Fila" do desktop: decidido sai da fila, o
// próximo candidato ocupa a mesma posição sozinho quando a query revalida
// (sem precisar avançar o index manualmente).
//
// Fotos aqui ficam a cores, igual ao desktop (o p&b da placa clara "Kinetic"
// foi removido — ver CampaignFilaTab.tsx).

const SWIPE_THRESHOLD = 56;

interface Props {
  campaign: Campaign;
  applications: Application[];
  appsLoading: boolean;
  /** Mutations vêm de fora — compartilhadas com a lista Pipeline do desktop
   * (mesma instância, mesmo cache), não recriadas aqui. */
  approve: ReturnType<typeof useApproveApplication>;
  reject: ReturnType<typeof useRejectApplication>;
  refreshIg: ReturnType<typeof useRefreshApplicationIg>;
  /** "Fechar revisão" — quem chama decide o que "sair" significa (rota
   * própria no protótipo standalone; troca de aba quando embutido na Fila). */
  onExit: () => void;
}

export default function CampaignPipelineMobileStory({
  campaign,
  applications,
  appsLoading,
  approve,
  reject,
  refreshIg,
  onExit,
}: Props) {
  const queue = useMemo(() => applications.filter((a) => a.status === 'PENDING'), [applications]);

  const [index, setIndex] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [tally, setTally] = useState({ approved: 0, rejected: 0 });
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const clampedIndex = Math.min(index, queue.length);
  const current = queue[clampedIndex] ?? null;
  const done = clampedIndex >= queue.length;

  function goNext() {
    if (sheetOpen) {
      setSheetOpen(false);
      return;
    }
    setIndex((i) => Math.min(i + 1, queue.length));
  }

  function goPrev() {
    if (sheetOpen) {
      setSheetOpen(false);
      return;
    }
    setIndex((i) => Math.max(i - 1, 0));
  }

  function handleApprove() {
    if (!current) return;
    approve.mutate(current.id, {
      onSuccess: () => setTally((t) => ({ ...t, approved: t.approved + 1 })),
    });
  }

  function handleReject() {
    if (!current) return;
    reject.mutate(current.id, {
      onSuccess: () => setTally((t) => ({ ...t, rejected: t.rejected + 1 })),
    });
  }

  function handleTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }

  // Só horizontal — sem gesto vertical aqui. O conteúdo agora rola de verdade
  // (fix do bug de sobreposição), então "arrastar pra cima" ficaria ambíguo
  // com o scroll nativo da tela. Abrir/fechar o painel de detalhes fica só
  // com o botão "Ver posts" + tocar fora/na alcinha (já existiam do mesmo
  // jeito, continuam valendo).
  function handleTouchEnd(e: React.TouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;

    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) goNext();
      else goPrev();
    }
  }

  return (
    // z-50: cobre a bottom tab bar do BrandLayout (z-40) — takeover
    // imersivo de verdade, sem a nav do app espiando embaixo.
    <div className="fixed inset-0 z-50 flex justify-center bg-kinetic-black text-kinetic-light">
      {/* Largura de telefone mesmo em tablet (breakpoint é lg inteiro) — sem
          isso o hero em tela cheia esticaria feio numa viewport de ~800px;
          "use seu julgamento" era literalmente o pedido do Pedro pro tablet. */}
      <div className="flex min-h-0 w-full max-w-[480px] flex-col">
      {/* Header — progresso Story + fechar */}
      <div className="shrink-0 px-4" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}>
        {!done && queue.length > 0 && (
          <div className="mb-3 flex gap-1">
            {queue.map((app, i) => (
              <span
                key={app.id}
                className={cn(
                  'h-[3px] flex-1 rounded-full transition-colors',
                  i < clampedIndex ? 'bg-white/70' : i === clampedIndex ? 'bg-lime' : 'bg-white/20',
                )}
              />
            ))}
          </div>
        )}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onExit}
            aria-label="Fechar revisão"
            className="-ml-1 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <X size={18} />
          </button>
          {!done && queue.length > 0 && (
            <span className="font-mono text-xs uppercase tracking-widest text-kinetic-muted">
              {clampedIndex + 1} / {queue.length}
            </span>
          )}
        </div>
      </div>

      {appsLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-lime border-t-transparent" />
        </div>
      ) : done || !current ? (
        <CompletionState
          approved={tally.approved}
          rejected={tally.rejected}
          remaining={queue.length}
          onBack={onExit}
        />
      ) : (
        <CandidateStory
          key={current.id}
          application={current}
          campaign={campaign}
          sheetOpen={sheetOpen}
          onOpenSheet={() => setSheetOpen(true)}
          onCloseSheet={() => setSheetOpen(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onPrev={goPrev}
          onNext={goNext}
          onApprove={handleApprove}
          onReject={handleReject}
          isApproving={approve.isPending && approve.variables === current.id}
          isRejecting={reject.isPending && reject.variables === current.id}
          isRefreshingIg={refreshIg.isPending && refreshIg.variables === current.id}
          refreshIgError={refreshIg.variables === current.id ? refreshIg.error : null}
          onRefreshIg={() => refreshIg.mutate(current.id)}
        />
      )}
      </div>
    </div>
  );
}

// ─── Um candidato, tela cheia ──────────────────────────────────────────────────

function CandidateStory({
  application,
  campaign,
  sheetOpen,
  onOpenSheet,
  onCloseSheet,
  onTouchStart,
  onTouchEnd,
  onPrev,
  onNext,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
  isRefreshingIg,
  refreshIgError,
  onRefreshIg,
}: {
  application: Application;
  campaign: Campaign;
  sheetOpen: boolean;
  onOpenSheet: () => void;
  onCloseSheet: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onPrev: () => void;
  onNext: () => void;
  onApprove: () => void;
  onReject: () => void;
  isApproving: boolean;
  isRejecting: boolean;
  isRefreshingIg: boolean;
  refreshIgError: unknown;
  onRefreshIg: () => void;
}) {
  const { influencer, message } = application;
  const handle = influencer.instagramHandle?.replace(/^@+/, '');
  const avatarSrc = influencer.igProfilePicUrl
    ? `/api/v1/ig/avatar/${influencer.id}`
    : influencer.avatarUrl;
  const followers =
    influencer.followersCount != null ? formatNumberParts(influencer.followersCount) : null;
  const igLoading = influencer.igFetchStatus === 'PENDING';
  const igFailed = influencer.igFetchStatus === 'FAILED' || influencer.igFetchStatus === null;
  const cooldownWait = extractCooldownWait(refreshIgError);
  const posts = Array.from({ length: 6 }, (_, i) => influencer.igRecentPosts?.[i] ?? null);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col animate-tayro-count motion-reduce:animate-none">
      {/* Único container de scroll da tela: foto + métricas + oferta fluem
          juntos, natural — sem vh/alturas fixas brigando por espaço. `min-h-0`
          é o que faz esse flex-1 respeitar a altura do pai em vez de crescer
          pelo conteúdo e empurrar as ações pra fora da viewport (era o bug:
          o conteúdo ficava "atrás" da barra de ação porque o scroll interno
          nunca alcançava o fim de verdade). */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Foto — aspect-ratio em vez de vh: cresce com a largura do cartão,
            não compete com o resto por espaço de viewport. */}
        <div
          className="relative aspect-[4/5] w-full shrink-0 overflow-hidden bg-kinetic-dark"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {avatarSrc && <img src={avatarSrc} alt="" className="h-full w-full object-cover" />}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-kinetic-black via-kinetic-black/15 to-transparent" />

          {/* Zonas de toque — candidato anterior / próximo */}
          <button
            type="button"
            onClick={onPrev}
            aria-label="Candidato anterior"
            className="absolute inset-y-0 left-0 w-1/2"
          />
          <button
            type="button"
            onClick={onNext}
            aria-label="Próximo candidato"
            className="absolute inset-y-0 right-0 w-1/2"
          />

          {/* Identidade sobre o gradiente */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 px-5 pb-5">
            <h2 className="text-3xl font-bold leading-tight tracking-tight text-white">
              {influencer.name}
            </h2>
            {handle && <p className="mt-1 font-mono text-sm text-kinetic-text">@{handle}</p>}
            {(influencer.city || influencer.niches.length > 0) && (
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-kinetic-text">
                {influencer.city && (
                  <span className="flex items-center gap-1">
                    <MapPin size={12} />
                    {influencer.city}
                  </span>
                )}
                {influencer.niches.slice(0, 2).map((n) => (
                  <span key={n} className="capitalize">
                    {n}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Métricas + oferta — flui logo abaixo da foto, mesmo scroll */}
        <div className="px-5 py-5">
        {igLoading ? (
          <div className="flex animate-pulse gap-8">
            <div className="h-10 w-16 rounded bg-kinetic-dark" />
            <div className="h-10 w-16 rounded bg-kinetic-dark" />
          </div>
        ) : igFailed ? (
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-xs text-kinetic-muted">Dados do Instagram indisponíveis</span>
            <button
              type="button"
              onClick={onRefreshIg}
              disabled={isRefreshingIg || cooldownWait !== null}
              className={cn(
                'flex shrink-0 items-center gap-1.5 font-mono text-xs uppercase tracking-widest transition-colors',
                isRefreshingIg || cooldownWait !== null
                  ? 'cursor-not-allowed text-kinetic-muted'
                  : 'text-kinetic-text hover:text-white',
              )}
            >
              <RefreshCw size={12} className={cn(isRefreshingIg && 'animate-spin')} />
              {isRefreshingIg
                ? 'Atualizando…'
                : cooldownWait !== null
                  ? `${cooldownWait} min`
                  : 'Atualizar'}
            </button>
          </div>
        ) : (
          <div className="flex gap-8">
            {followers && (
              <div>
                <p className="font-mono text-[11px] uppercase tracking-widest text-kinetic-muted">
                  Followers
                </p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-white">
                  {followers.value}
                  {followers.suffix}
                </p>
              </div>
            )}
            {influencer.igEngagementRate != null && (
              <div>
                <p className="font-mono text-[11px] uppercase tracking-widest text-kinetic-muted">
                  Engagement
                </p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-white">
                  {formatEngagement(influencer.igEngagementRate)}
                </p>
              </div>
            )}
          </div>
        )}

        <p className="mb-1 mt-6 font-mono text-[11px] uppercase tracking-widest text-kinetic-muted">
          Oferta da campanha
        </p>
        <p className="text-lg font-semibold leading-snug text-white">{formatOffer(campaign)}</p>

        <button
          type="button"
          onClick={onOpenSheet}
          className="mt-5 flex w-full flex-col items-center gap-1 py-2 text-kinetic-muted transition-colors hover:text-white"
        >
          <ChevronUp size={16} />
          <span className="font-mono text-[10px] uppercase tracking-widest">Ver posts</span>
        </button>
        </div>
      </div>

      {/* Ações — fora do container de scroll, nunca sobrepõe o conteúdo:
          espaço reservado pelo próprio flexbox (irmã do scroll, não
          fixed/absolute por cima dele). */}
      <div
        className="flex shrink-0 gap-3 px-5 pt-3"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        <button
          type="button"
          onClick={onReject}
          disabled={isApproving || isRejecting}
          className="min-h-[56px] flex-1 border border-kinetic-border font-mono text-sm font-medium uppercase tracking-widest text-kinetic-text transition-colors hover:border-[#555] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isRejecting ? 'Descartando…' : 'Descartar'}
        </button>
        <button
          type="button"
          onClick={onApprove}
          disabled={isApproving || isRejecting}
          className="min-h-[56px] flex-[1.4] bg-lime font-mono text-sm font-semibold uppercase tracking-widest text-black transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isApproving ? 'Aprovando…' : 'Aprovar'}
        </button>
      </div>

      {/* Fundo pra fechar o painel tocando fora dele */}
      {sheetOpen && (
        <button
          type="button"
          aria-label="Fechar detalhes"
          onClick={onCloseSheet}
          className="absolute inset-0 z-[5] bg-black/50"
        />
      )}

      {/* Painel de informações extra — sobe sem sair da tela do candidato */}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 z-10 flex max-h-[75%] flex-col rounded-t-2xl bg-kinetic-dark transition-transform duration-300 ease-out',
          sheetOpen ? 'translate-y-0' : 'translate-y-full',
        )}
      >
        <button
          type="button"
          onClick={onCloseSheet}
          className="flex min-h-[44px] shrink-0 items-center justify-center"
          aria-label="Fechar detalhes"
        >
          <span className="h-1 w-10 rounded-full bg-kinetic-border" />
        </button>
        <div
          className="overflow-y-auto px-5 pb-8"
          style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}
        >
          {message && (
            <div className="mb-6">
              <p className="mb-2 font-mono text-xs uppercase tracking-widest text-kinetic-muted">
                Nota da candidatura
              </p>
              <p className="text-[15px] leading-relaxed text-kinetic-text">&ldquo;{message}&rdquo;</p>
            </div>
          )}
          {influencer.niches.length > 0 && (
            <div className="mb-6">
              <p className="mb-2 font-mono text-xs uppercase tracking-widest text-kinetic-muted">
                Nichos
              </p>
              <div className="flex flex-wrap gap-2">
                {influencer.niches.map((n) => (
                  <span
                    key={n}
                    className="rounded-full border border-kinetic-border px-3 py-1 text-xs capitalize text-kinetic-text"
                  >
                    {n}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="mb-2 font-mono text-xs uppercase tracking-widest text-kinetic-muted">
              Feed recente
            </p>
            <div className="grid grid-cols-3 gap-2">
              {posts.map((post, i) =>
                post ? (
                  <img
                    key={i}
                    src={post.thumbnail}
                    alt=""
                    loading="lazy"
                    className="aspect-square w-full rounded object-cover"
                  />
                ) : (
                  <div key={i} className="aspect-square w-full rounded bg-kinetic-gray" />
                ),
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Fim da fila ───────────────────────────────────────────────────────────────

function CompletionState({
  approved,
  rejected,
  remaining,
  onBack,
}: {
  approved: number;
  rejected: number;
  remaining: number;
  onBack: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-8 py-8 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-lime">Revisão concluída</p>
      <h2 className="mt-3 text-4xl font-bold tracking-tight text-white">Fila em dia.</h2>

      <div className="mt-10 grid w-full max-w-xs grid-cols-3 gap-4 border-y border-kinetic-gray py-6">
        <div>
          <p className="text-2xl font-bold text-lime">{approved}</p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-kinetic-muted">
            Aprovadas
          </p>
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{rejected}</p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-kinetic-muted">
            Recusadas
          </p>
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{remaining}</p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-kinetic-muted">
            Pendentes
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onBack}
        className="mt-10 min-h-[56px] w-full max-w-xs bg-lime font-mono text-sm font-semibold uppercase tracking-widest text-black transition-colors hover:bg-white"
      >
        Voltar para a campanha
      </button>
    </div>
  );
}
