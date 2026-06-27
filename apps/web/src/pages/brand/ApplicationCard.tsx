import { RefreshCw, AlertCircle, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import Avatar from '../../components/primitives/Avatar';
import StatBlock from '../../components/primitives/StatBlock';
import StatusPill from '../../components/primitives/StatusPill';
import { formatEngagement, formatNumber } from '../../utils/format';
import { extractCooldownWait } from '../../hooks/useCampaignApplications';
import type { Application, IgFetchStatus, IgPost } from '../../types/api';
import { cn } from '../../lib/utils';

// ─── Skeleton para dados IG ainda em PENDING ──────────────────────────────────

function IgSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="flex gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-1">
            <div className="h-3 w-12 rounded bg-secondary" />
            <div className="h-4 w-10 rounded bg-secondary" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-6 gap-1.5">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="aspect-square w-full rounded-md bg-secondary" />
        ))}
      </div>
    </div>
  );
}

// ─── Faixa de thumbnails dos posts ────────────────────────────────────────────

function IgPostStrip({ posts }: { posts: IgPost[] }) {
  return (
    <div className="grid grid-cols-6 gap-1.5">
      {posts.slice(0, 6).map((post, i) => (
        <img
          key={i}
          src={post.thumbnail}
          alt=""
          className="aspect-square w-full rounded-md object-cover"
          loading="lazy"
        />
      ))}
    </div>
  );
}

// ─── Bloco de dados IG com os 3 estados ──────────────────────────────────────

interface IgBlockProps {
  status: IgFetchStatus | null;
  /** true quando igFetchStatus=PENDING mas o poll atingiu o teto de tempo */
  timedOut: boolean;
  followersCount: number | null;
  igEngagementRate: number | null;
  igRecentPosts: IgPost[] | null;
  isRefreshing: boolean;
  refreshError: unknown;
  onRefresh: () => void;
}

function IgBlock({
  status,
  timedOut,
  followersCount,
  igEngagementRate,
  igRecentPosts,
  isRefreshing,
  refreshError,
  onRefresh,
}: IgBlockProps) {
  // null → nunca buscado (conta criada via auth normal) → mostra botão manual
  // PENDING + timedOut → poll esgotado → mostra botão manual
  // PENDING sem timeout → skeleton (fetch em andamento)
  const displayState =
    status === 'OK'
      ? 'ok'
      : status === 'FAILED' || status === null || timedOut
      ? 'failed'
      : 'loading';
  const cooldownWait = extractCooldownWait(refreshError);

  if (displayState === 'loading') return <IgSkeleton />;

  if (displayState === 'failed') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <AlertCircle size={13} className="shrink-0 text-destructive" />
          <span className="text-xs text-muted-foreground">Dados do Instagram indisponíveis</span>
          <button
            onClick={onRefresh}
            disabled={isRefreshing || cooldownWait !== null}
            className={cn(
              'ml-auto flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium transition-colors',
              isRefreshing || cooldownWait !== null
                ? 'cursor-not-allowed text-muted-foreground'
                : 'hover:border-lime/40 hover:text-lime',
            )}
          >
            <RefreshCw size={11} className={cn(isRefreshing && 'animate-spin')} />
            {isRefreshing
              ? 'Atualizando…'
              : cooldownWait !== null
              ? `Tente em ${cooldownWait} min`
              : 'Atualizar'}
          </button>
        </div>
        {/* Thumbnails placeholder */}
        <div className="grid grid-cols-6 gap-1.5">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="aspect-square w-full rounded-md bg-secondary/50" />
          ))}
        </div>
      </div>
    );
  }

  // OK
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-5">
        {followersCount != null && (
          <StatBlock label="Seguidores" value={formatNumber(followersCount)} />
        )}
        {igEngagementRate != null && (
          <StatBlock label="Engajamento" value={formatEngagement(igEngagementRate)} />
        )}
      </div>
      {igRecentPosts && igRecentPosts.length > 0 && (
        <IgPostStrip posts={igRecentPosts} />
      )}
    </div>
  );
}

// ─── Card principal ───────────────────────────────────────────────────────────

interface Props {
  application: Application;
  onApprove: () => void;
  onReject: () => void;
  onRefreshIg: () => void;
  isApproving: boolean;
  isRejecting: boolean;
  isRefreshingIg: boolean;
  refreshIgError: unknown;
  /** true quando igFetchStatus=PENDING mas o poll atingiu o teto de 45s */
  igTimedOut: boolean;
}

export default function ApplicationCard({
  application,
  onApprove,
  onReject,
  onRefreshIg,
  isApproving,
  isRejecting,
  isRefreshingIg,
  refreshIgError,
  igTimedOut,
}: Props) {
  const { influencer, status, message } = application;
  const isPending = status === 'PENDING';
  // Normaliza o handle: remove @ inicial do banco, adiciona exatamente um
  const handle = influencer.instagramHandle?.replace(/^@+/, '');

  return (
    <article className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:border-border/80">
      {/* Header: avatar + identidade + status */}
      <div className="flex items-start gap-4">
        <Avatar src={influencer.igProfilePicUrl ?? influencer.avatarUrl} name={influencer.name} size="lg" />

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-base font-semibold text-foreground">
              {influencer.name}
            </span>
            <StatusPill status={status} />
          </div>

          {handle && (
            <a
              href={`https://instagram.com/${handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-lime"
            >
              @{handle}
              <ExternalLink size={12} className="shrink-0" />
            </a>
          )}

          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            {influencer.niches.map((niche) => (
              <span key={niche} className="text-xs text-muted-foreground">
                {niche}
              </span>
            ))}
            {influencer.city && (
              <span className="text-xs text-muted-foreground">· {influencer.city}</span>
            )}
          </div>
        </div>
      </div>

      {/* Mensagem da creator */}
      {message && (
        <p className="rounded-lg bg-accent px-4 py-3 text-sm italic text-foreground/80">
          &ldquo;{message}&rdquo;
        </p>
      )}

      {/* Dados do Instagram */}
      <IgBlock
        status={influencer.igFetchStatus}
        timedOut={igTimedOut}
        followersCount={influencer.followersCount}
        igEngagementRate={influencer.igEngagementRate}
        igRecentPosts={influencer.igRecentPosts}
        isRefreshing={isRefreshingIg}
        refreshError={refreshIgError}
        onRefresh={onRefreshIg}
      />

      {/* Ações — só para candidaturas pendentes */}
      {isPending && (
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <button
            onClick={onReject}
            disabled={isRejecting || isApproving}
            className={cn(
              'flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors',
              'hover:border-destructive/40 hover:text-destructive',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            <XCircle size={14} />
            {isRejecting ? 'Rejeitando…' : 'Rejeitar'}
          </button>

          <button
            onClick={onApprove}
            disabled={isApproving || isRejecting}
            className={cn(
              'flex items-center gap-1.5 rounded-lg bg-lime px-4 py-2 text-sm font-semibold text-background transition-opacity',
              'hover:opacity-90',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            <CheckCircle size={14} />
            {isApproving ? 'Aprovando…' : 'Aprovar'}
          </button>
        </div>
      )}
    </article>
  );
}
