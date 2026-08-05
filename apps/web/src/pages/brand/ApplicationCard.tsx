import { ArrowRight, RefreshCw, ExternalLink } from 'lucide-react';
import Plate from '../../components/primitives/Plate';
import PlateActionBar from '../../components/primitives/PlateActionBar';
import CountUp from '../../components/primitives/CountUp';
import { formatEngagement, formatNumberParts } from '../../utils/format';
import { extractCooldownWait } from '../../hooks/useCampaignApplications';
import type { Application, IgFetchStatus, IgPost } from '../../types/api';
import { cn } from '../../lib/utils';

// ─── Grade de thumbnails (6, sempre) ──────────────────────────────────────────

function ThumbGrid({ posts }: { posts: IgPost[] | null }) {
  const cells = Array.from({ length: 6 }, (_, i) => posts?.[i] ?? null);
  return (
    <div className="grid grid-cols-6 gap-[5px]">
      {cells.map((post, i) =>
        post ? (
          <img
            key={i}
            src={post.thumbnail}
            alt=""
            loading="lazy"
            className="aspect-square w-full rounded-[3px] object-cover"
          />
        ) : (
          <div key={i} className="aspect-square w-full rounded-[3px] bg-plate-fill" />
        ),
      )}
    </div>
  );
}

// ─── Bloco de seguidores/engajamento — 3 estados (PENDING/FAILED/OK) ─────────

interface IgBlockProps {
  status: IgFetchStatus | null;
  timedOut: boolean;
  followersCount: number | null;
  igEngagementRate: number | null;
  isRefreshing: boolean;
  refreshError: unknown;
  onRefresh: () => void;
}

function IgBlock({
  status,
  timedOut,
  followersCount,
  igEngagementRate,
  isRefreshing,
  refreshError,
  onRefresh,
}: IgBlockProps) {
  const displayState =
    status === 'OK' ? 'ok' : status === 'FAILED' || status === null || timedOut ? 'failed' : 'loading';
  const cooldownWait = extractCooldownWait(refreshError);
  const followers = followersCount != null ? formatNumberParts(followersCount) : null;

  if (displayState === 'loading') {
    return (
      <div className="mb-7 animate-pulse space-y-2">
        <div className="flex gap-7">
          <div className="h-[46px] w-16 rounded bg-plate-fill" />
          <div className="h-[46px] w-16 rounded bg-plate-fill" />
        </div>
      </div>
    );
  }

  if (displayState === 'failed') {
    return (
      <div className="mb-7 flex items-center justify-between gap-3">
        <span className="text-xs text-plate-muted">Dados do Instagram indisponíveis</span>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing || cooldownWait !== null}
          className={cn(
            'flex shrink-0 items-center gap-1.5 text-xs font-medium transition-colors',
            isRefreshing || cooldownWait !== null
              ? 'cursor-not-allowed text-plate-muted'
              : 'text-plate-body hover:text-plate-ink',
          )}
        >
          <RefreshCw size={13} className={cn(isRefreshing && 'animate-spin')} />
          {isRefreshing ? 'Atualizando…' : cooldownWait !== null ? `Tente em ${cooldownWait} min` : 'Atualizar'}
        </button>
      </div>
    );
  }

  return (
    <div className="mb-7 flex items-end gap-7">
      {followers && (
        <div>
          <CountUp>
            <span className="font-display text-d-xl text-plate-ink tabular-nums">
              {/* sufixo (k/M) vem do próprio formatador — nunca hardcoded, senão
                  800 seguidores viram "800k" e 13,6M vira "13,6Mk" */}
              {followers.value}
              <span className="text-[23px]">{followers.suffix}</span>
            </span>
          </CountUp>
          <p className="mt-3 text-xs text-plate-soft">seguidores</p>
        </div>
      )}
      {igEngagementRate != null && (
        <div>
          <CountUp delay={140}>
            <span className="font-display text-d-xl text-plate-ink tabular-nums">
              {formatEngagement(igEngagementRate).replace('%', '')}
              <span className="text-[23px]">%</span>
            </span>
          </CountUp>
          <p className="mt-3 text-xs text-plate-soft">engajamento</p>
        </div>
      )}
      <button
        type="button"
        onClick={onRefresh}
        disabled={isRefreshing || cooldownWait !== null}
        aria-label={isRefreshing ? 'Atualizando…' : cooldownWait !== null ? `Tente em ${cooldownWait} min` : 'Atualizar dados do Instagram'}
        className="ml-auto mb-1.5 shrink-0 text-[#9A9A94] transition-colors hover:text-plate-ink disabled:cursor-not-allowed"
      >
        <RefreshCw size={15} className={cn(isRefreshing && 'animate-spin')} />
      </button>
    </div>
  );
}

// ─── Card principal — UM candidato, a placa da fila (tela 2) ────────────────

interface Props {
  application: Application;
  /** posição 1-based na fila (pra o #NN mono e continuidade com o pager). */
  position: number;
  onApprove: () => void;
  onReject: () => void;
  onRefreshIg: () => void;
  isApproving: boolean;
  isRejecting: boolean;
  isRefreshingIg: boolean;
  refreshIgError: unknown;
  /** true quando igFetchStatus=PENDING mas o poll atingiu o teto de 45s. */
  igTimedOut: boolean;
}

export default function ApplicationCard({
  application,
  position,
  onApprove,
  onReject,
  onRefreshIg,
  isApproving,
  isRejecting,
  isRefreshingIg,
  refreshIgError,
  igTimedOut,
}: Props) {
  const { influencer, message } = application;
  const handle = influencer.instagramHandle?.replace(/^@+/, '');
  const avatarSrc = influencer.igProfilePicUrl
    ? `/api/v1/ig/avatar/${influencer.id}`
    : influencer.avatarUrl;

  return (
    <Plate marks="top" flush>
      <div className="px-6 pb-[26px] pt-[26px]">
        {/* Identidade */}
        <div className="mb-7 flex items-start gap-4">
          <div className="h-[60px] w-[60px] shrink-0 overflow-hidden rounded-[4px] bg-plate-fill">
            {avatarSrc && <img src={avatarSrc} alt="" className="h-full w-full object-cover" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="truncate font-display text-[21px] font-bold leading-[1.05] tracking-[-.045em] text-plate-ink">
                {influencer.name}
              </p>
              <span className="shrink-0 font-mono text-[10px] text-[#8A8A84]">
                #{String(position).padStart(2, '0')}
              </span>
            </div>
            {handle && (
              <a
                href={`https://instagram.com/${handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-[7px] flex w-fit items-center gap-[5px] text-[13px] text-plate-muted transition-colors hover:text-plate-ink"
              >
                @{handle}
                <ExternalLink size={11} className="shrink-0" />
              </a>
            )}
            <p className="mt-[6px] flex items-center gap-1.5 text-xs text-[#8E8E88]">
              <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-signal-dot" />
              Aguardando resposta
            </p>
          </div>
        </div>

        {/* Seguidores / engajamento */}
        <IgBlock
          status={influencer.igFetchStatus}
          timedOut={igTimedOut}
          followersCount={influencer.followersCount}
          igEngagementRate={influencer.igEngagementRate}
          isRefreshing={isRefreshingIg}
          refreshError={refreshIgError}
          onRefresh={onRefreshIg}
        />

        {/* Mensagem da creator */}
        {message && (
          <p className="mb-7 text-[15px] leading-[1.5] text-plate-body">&ldquo;{message}&rdquo;</p>
        )}

        {/* Grade do Instagram */}
        <ThumbGrid posts={influencer.igRecentPosts} />
      </div>

      <PlateActionBar
        secondary={{
          label: isRejecting ? 'Descartando…' : 'Descartar',
          onClick: onReject,
          disabled: isRejecting || isApproving,
          width: 100,
        }}
        primary={{
          label: isApproving ? 'Aprovando…' : 'Aprovar',
          onClick: onApprove,
          disabled: isApproving || isRejecting,
          icon: <ArrowRight size={16} />,
        }}
      />
    </Plate>
  );
}
