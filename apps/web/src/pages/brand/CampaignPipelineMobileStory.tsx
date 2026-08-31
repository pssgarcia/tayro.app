import { useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronUp, ExternalLink, MapPin, RefreshCw, X } from 'lucide-react';
import {
  extractCooldownWait,
  useApproveApplication,
  useRefreshApplicationIg,
  useRejectApplication,
} from '../../hooks/useCampaignApplications';
import {
  creatorAvatarSrc,
  creatorPostSrc,
  formatEngagement,
  formatNumberParts,
  formatOffer,
} from '../../utils/format';
import KineticRow from '../../components/primitives/kinetic/KineticRow';
import StatusWord from '../../components/primitives/kinetic/StatusWord';
import { cn } from '../../lib/utils';
import type { Application, Campaign } from '../../types/api';

// ─── Mobile: revisão em formato Story ─────────────────────────────────────────
// NÃO é o desktop espremido — fluxo próprio pra celular, um candidato por vez
// em tela cheia, navegação por toque/arraste (pedido explícito do Pedro:
// "Instagram Stories + revisão de creator premium + identidade Kinetic
// Editorial", desktop fica exatamente como está).
//
// Dois modos, mesmo dado (paridade com o desktop, que tem placa de decisão +
// lista Pipeline lado a lado):
//   • "Revisar" — a fila PENDING, um candidato por vez, aprovar/recusar.
//   • "Todas"   — lista de TODA candidatura da campanha (qualquer status), com
//                 o rótulo de status; tocar numa linha abre o mesmo detalhe.
//                 Fecha o buraco de o celular não ter nenhuma superfície pra
//                 ver quem já foi aprovado/recusado (mobile-first, D-10).
//
// Fotos aqui ficam a cores, igual ao desktop (o p&b da placa clara "Kinetic"
// foi removido — ver CampaignFilaTab.tsx).

const SWIPE_THRESHOLD = 56;

type Mode = 'review' | 'all';

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

  const [mode, setMode] = useState<Mode>('review');
  const [index, setIndex] = useState(0);
  const [allSelectedId, setAllSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  // Intenção de decisão desta sessão, chaveada por id da candidatura — gravada
  // no clique. NÃO usar o onSuccess com escopo do `mutate` pra contar: ele é
  // sobrescrito quando a decisão seguinte sai antes de a anterior liquidar
  // (o invalidateQueries do hook ainda revalidando segura o isPending, mas a
  // candidatura já avançou e o botão reabilita) — era por isso que o resumo
  // vinha sempre 0 / 0 / 0. A contagem final cruza esse mapa com o status
  // real na lista revalidada, então só entra quem o servidor confirmou.
  const [decided, setDecided] = useState<Record<string, 'approved' | 'rejected'>>({});
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const tally = useMemo(() => {
    const statusById = new Map(applications.map((a) => [a.id, a.status]));
    let approved = 0;
    let rejected = 0;
    for (const [id, intent] of Object.entries(decided)) {
      if (intent === 'approved' && statusById.get(id) === 'APPROVED') approved += 1;
      else if (intent === 'rejected' && statusById.get(id) === 'REJECTED') rejected += 1;
    }
    return { approved, rejected };
  }, [applications, decided]);

  // ── Modo Revisar ──
  const clampedIndex = Math.min(index, queue.length);
  const reviewCurrent = queue[clampedIndex] ?? null;
  const reviewDone = clampedIndex >= queue.length;

  // ── Modo Todas ──
  const allIndex =
    mode === 'all' && allSelectedId != null
      ? applications.findIndex((a) => a.id === allSelectedId)
      : -1;
  const allCurrent = allIndex >= 0 ? applications[allIndex] : null;

  // O candidato em detalhe agora — o mesmo `CandidateStory` serve os dois modos.
  const active = mode === 'review' ? (reviewDone ? null : reviewCurrent) : allCurrent;
  const showCompletion = mode === 'review' && (reviewDone || !reviewCurrent);
  const inAllDetail = mode === 'all' && allCurrent != null;

  function changeMode(next: Mode) {
    setMode(next);
    setAllSelectedId(null);
    setSheetOpen(false);
  }

  function selectFromList(id: string) {
    setAllSelectedId(id);
    setSheetOpen(false);
  }

  function goNext() {
    if (sheetOpen) {
      setSheetOpen(false);
      return;
    }
    if (mode === 'all') {
      const next = allIndex >= 0 ? applications[allIndex + 1] : undefined;
      if (next) setAllSelectedId(next.id);
      return;
    }
    setIndex((i) => Math.min(i + 1, queue.length));
  }

  function goPrev() {
    if (sheetOpen) {
      setSheetOpen(false);
      return;
    }
    if (mode === 'all') {
      if (allIndex >= 1) setAllSelectedId(applications[allIndex - 1].id);
      return;
    }
    setIndex((i) => Math.max(i - 1, 0));
  }

  function handleApprove() {
    if (!active) return;
    setDecided((d) => ({ ...d, [active.id]: 'approved' }));
    approve.mutate(active.id);
  }

  function handleReject() {
    if (!active) return;
    setDecided((d) => ({ ...d, [active.id]: 'rejected' }));
    reject.mutate(active.id);
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

  const showReviewCounter = mode === 'review' && !reviewDone && queue.length > 0;

  return (
    // z-50: cobre a bottom tab bar do BrandLayout (z-40) — takeover
    // imersivo de verdade, sem a nav do app espiando embaixo.
    <div className="fixed inset-0 z-50 flex justify-center bg-kinetic-black text-kinetic-light">
      {/* Largura de telefone mesmo em tablet (breakpoint é lg inteiro) — sem
          isso o hero em tela cheia esticaria feio numa viewport de ~800px;
          "use seu julgamento" era literalmente o pedido do Pedro pro tablet. */}
      <div className="flex min-h-0 w-full max-w-[480px] flex-col">
        {/* Header — progresso Story + fechar + alternador de modo */}
        <div
          className="shrink-0 px-4"
          style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}
        >
          {showReviewCounter && (
            <div className="mb-3 flex gap-1">
              {queue.map((app, i) => (
                <span
                  key={app.id}
                  className={cn(
                    'h-[3px] flex-1 rounded-full transition-colors',
                    i < clampedIndex
                      ? 'bg-white/70'
                      : i === clampedIndex
                        ? 'bg-lime'
                        : 'bg-white/20',
                  )}
                />
              ))}
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onExit}
              aria-label="Fechar revisão"
              className="-ml-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <X size={18} />
            </button>

            {inAllDetail ? (
              <button
                type="button"
                onClick={() => setAllSelectedId(null)}
                aria-label="Voltar à lista"
                className="flex items-center gap-1 font-mono text-xs uppercase tracking-widest text-kinetic-text transition-colors hover:text-white"
              >
                <ChevronLeft size={14} />
                Voltar
              </button>
            ) : (
              <ModeToggle mode={mode} onChange={changeMode} />
            )}

            {showReviewCounter ? (
              <span className="shrink-0 font-mono text-xs uppercase tracking-widest text-kinetic-muted">
                {clampedIndex + 1} / {queue.length}
              </span>
            ) : (
              <span className="h-11 w-11 shrink-0" aria-hidden />
            )}
          </div>
        </div>

        {appsLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-lime border-t-transparent" />
          </div>
        ) : showCompletion ? (
          <CompletionState
            approved={tally.approved}
            rejected={tally.rejected}
            remaining={queue.length}
            onBack={onExit}
          />
        ) : active ? (
          <CandidateStory
            key={active.id}
            application={active}
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
            isApproving={approve.isPending && approve.variables === active.id}
            isRejecting={reject.isPending && reject.variables === active.id}
            isRefreshingIg={refreshIg.isPending && refreshIg.variables === active.id}
            refreshIgError={refreshIg.variables === active.id ? refreshIg.error : null}
            onRefreshIg={() => refreshIg.mutate(active.id)}
          />
        ) : (
          <AllList applications={applications} onSelect={selectFromList} />
        )}
      </div>
    </div>
  );
}

// ─── Alternador de modo ────────────────────────────────────────────────────────

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="flex rounded-full border border-kinetic-border p-0.5 font-mono text-[11px] uppercase tracking-widest">
      {(['review', 'all'] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          aria-pressed={mode === m}
          className={cn(
            'rounded-full px-3 py-1 transition-colors',
            mode === m ? 'bg-lime text-black' : 'text-kinetic-muted hover:text-white',
          )}
        >
          {m === 'review' ? 'Revisar' : 'Todas'}
        </button>
      ))}
    </div>
  );
}

// ─── Modo Todas — lista de toda candidatura ────────────────────────────────────

function AllList({
  applications,
  onSelect,
}: {
  applications: Application[];
  onSelect: (id: string) => void;
}) {
  if (applications.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-8">
        <p className="font-mono text-sm text-kinetic-muted">Nenhuma candidatura ainda.</p>
      </div>
    );
  }

  return (
    <ul
      className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-3"
      style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
    >
      {applications.map((app) => {
        const avatarSrc = creatorAvatarSrc(app.influencer);
        return (
          <li key={app.id}>
            <KineticRow
              title={app.influencer.name}
              onClick={() => onSelect(app.id)}
              leading={
                <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-kinetic-gray">
                  {avatarSrc && (
                    <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
                  )}
                </span>
              }
              trailing={<StatusWord kind="application" status={app.status} />}
            />
          </li>
        );
      })}
    </ul>
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
  const avatarSrc = creatorAvatarSrc(influencer);
  const followers =
    influencer.followersCount != null ? formatNumberParts(influencer.followersCount) : null;
  const igLoading = influencer.igFetchStatus === 'PENDING';
  const igFailed = influencer.igFetchStatus === 'FAILED' || influencer.igFetchStatus === null;
  const cooldownWait = extractCooldownWait(refreshIgError);
  const posts = Array.from({ length: 6 }, (_, i) => influencer.igRecentPosts?.[i] ?? null);
  // Aprovar/recusar só faz sentido em candidatura pendente — decidida abre em
  // modo leitura (mesma regra da placa do desktop, ProfilePlate).
  const canDecide = application.status === 'PENDING';

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
            {handle && (
              <a
                href={`https://instagram.com/${handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="pointer-events-auto mt-1 flex w-fit items-center gap-1 font-mono text-sm text-kinetic-text transition-colors hover:text-white"
              >
                @{handle}
                <ExternalLink size={12} className="shrink-0" />
              </a>
            )}
            {influencer.phone && (
              <a
                href={`tel:${influencer.phone}`}
                className="pointer-events-auto mt-1 flex w-fit items-center gap-1 font-mono text-sm text-kinetic-text transition-colors hover:text-white"
              >
                {influencer.phone}
              </a>
            )}
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
              <span className="font-mono text-xs text-kinetic-muted">
                Dados do Instagram indisponíveis
              </span>
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
                    Seguidores
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
                    Engajamento
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
          fixed/absolute por cima dele). Some em candidatura já decidida. */}
      {canDecide && (
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
            {isRejecting ? 'Recusando…' : 'Recusar'}
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
      )}

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
              <p className="text-[15px] leading-relaxed text-kinetic-text">
                &ldquo;{message}&rdquo;
              </p>
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
                    src={creatorPostSrc(influencer.id, i)}
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
