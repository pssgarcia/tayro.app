import { useState } from 'react';
import { Film, Image, Play, BookOpen, CheckCircle, XCircle, RotateCcw, Layers } from 'lucide-react';
import type { CampaignSubmission, ContentStatus } from '../../types/api';
import {
  useCampaignSubmissions,
  useApproveSubmission,
  useRejectSubmission,
  useRequestRevision,
} from '../../hooks/useCampaignApplications';
import EmptyState from '../../components/primitives/EmptyState';
import { cn } from '../../lib/utils';

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ContentStatus, { label: string; className: string }> = {
  PENDING: { label: 'Aguardando', className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  APPROVED: { label: 'Aprovado', className: 'bg-lime/10 text-lime border-lime/20' },
  REJECTED: { label: 'Recusado', className: 'bg-red-500/10 text-red-400 border-red-500/20' },
  REVISION_REQUESTED: { label: 'Revisão', className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
};

const MEDIA_ICON: Record<string, React.ReactNode> = {
  VIDEO: <Play size={14} />,
  REEL: <Film size={14} />,
  IMAGE: <Image size={14} />,
  STORY: <BookOpen size={14} />,
};

// ─── Filtros ──────────────────────────────────────────────────────────────────

const FILTERS: { value: 'ALL' | ContentStatus; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'PENDING', label: 'Aguardando' },
  { value: 'APPROVED', label: 'Aprovados' },
  { value: 'REJECTED', label: 'Recusados' },
  { value: 'REVISION_REQUESTED', label: 'Revisão' },
];

// ─── Modal de revisão ─────────────────────────────────────────────────────────

function RevisionModal({
  submissionId,
  onConfirm,
  onCancel,
  isPending,
}: {
  submissionId: string;
  onConfirm: (id: string, feedback: string) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [feedback, setFeedback] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
        <h3 className="mb-2 font-display text-sm font-semibold text-foreground">
          Solicitar revisão
        </h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Descreva o que precisa ser ajustado no conteúdo.
        </p>
        <textarea
          autoFocus
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={4}
          placeholder="Ex: Precisa mencionar o código de desconto..."
          className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-lime focus:outline-none"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Cancelar
          </button>
          <button
            onClick={() => feedback.trim() && onConfirm(submissionId, feedback.trim())}
            disabled={!feedback.trim() || isPending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white disabled:opacity-50 hover:bg-blue-700"
          >
            {isPending ? 'Enviando...' : 'Solicitar revisão'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Card de submission ───────────────────────────────────────────────────────

function SubmissionCard({
  submission,
  onApprove,
  onReject,
  onRevision,
  isApproving,
  isRejecting,
}: {
  submission: CampaignSubmission;
  onApprove: () => void;
  onReject: () => void;
  onRevision: () => void;
  isApproving: boolean;
  isRejecting: boolean;
}) {
  const statusCfg = STATUS_CONFIG[submission.status];
  const isPending = submission.status === 'PENDING';

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-5 gap-4">
      {/* Header: creator + status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {submission.influencer.avatarUrl ? (
            <img
              src={submission.influencer.avatarUrl}
              alt={submission.influencer.name}
              className="h-8 w-8 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-muted-foreground">
              {submission.influencer.name[0].toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {submission.influencer.name}
            </p>
            {submission.influencer.instagramHandle && (
              <p className="truncate text-xs text-muted-foreground">
                @{submission.influencer.instagramHandle}
              </p>
            )}
          </div>
        </div>
        <span
          className={cn(
            'shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
            statusCfg.className,
          )}
        >
          {statusCfg.label}
        </span>
      </div>

      {/* Tipo de mídia + link */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          {MEDIA_ICON[submission.mediaType] ?? null}
          {submission.mediaType}
        </span>
        <a
          href={submission.mediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-lime hover:underline"
        >
          Ver conteúdo ↗
        </a>
      </div>

      {/* Caption */}
      {submission.caption && (
        <p className="text-xs leading-relaxed text-muted-foreground line-clamp-3">
          {submission.caption}
        </p>
      )}

      {/* Feedback da revisão */}
      {submission.feedback && (
        <div className="rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Feedback: </span>
          {submission.feedback}
        </div>
      )}

      {/* Ações (só em PENDING) */}
      {isPending && (
        <div className="flex gap-2 pt-1 border-t border-border">
          <button
            onClick={onApprove}
            disabled={isApproving}
            className="flex items-center gap-1.5 rounded-lg bg-lime/10 px-3 py-1.5 text-xs font-medium text-lime hover:bg-lime/20 disabled:opacity-50 transition-colors"
          >
            <CheckCircle size={13} />
            {isApproving ? 'Aprovando...' : 'Aprovar'}
          </button>
          <button
            onClick={onRevision}
            className="flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400 hover:bg-blue-500/20 transition-colors"
          >
            <RotateCcw size={13} />
            Revisão
          </button>
          <button
            onClick={onReject}
            disabled={isRejecting}
            className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-colors"
          >
            <XCircle size={13} />
            {isRejecting ? 'Recusando...' : 'Recusar'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Aba principal ────────────────────────────────────────────────────────────

export default function CampaignContentTab({ campaignId }: { campaignId: string }) {
  const [filter, setFilter] = useState<'ALL' | ContentStatus>('ALL');
  const [revisionTarget, setRevisionTarget] = useState<string | null>(null);

  const { data: submissions = [], isLoading } = useCampaignSubmissions(campaignId);
  const approve = useApproveSubmission(campaignId);
  const reject = useRejectSubmission(campaignId);
  const revision = useRequestRevision(campaignId);

  const visible =
    filter === 'ALL' ? submissions : submissions.filter((s) => s.status === filter);

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-border bg-card p-5 space-y-4"
          >
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-secondary" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3 w-28 rounded bg-secondary" />
                <div className="h-2.5 w-20 rounded bg-secondary" />
              </div>
            </div>
            <div className="h-3 w-full rounded bg-secondary" />
            <div className="h-3 w-3/4 rounded bg-secondary" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              filter === value
                ? 'border-lime/30 bg-lime/10 text-lime'
                : 'border-border text-muted-foreground hover:border-border/80 hover:text-foreground',
            )}
          >
            {label}
            {value === 'ALL' && (
              <span className="ml-1.5 tabular-nums text-muted-foreground">
                {submissions.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lista ou empty state */}
      {visible.length === 0 ? (
        <EmptyState
          icon={<Layers size={20} />}
          title={
            filter === 'ALL'
              ? 'Nenhum conteúdo enviado ainda'
              : 'Nenhum conteúdo com esse status'
          }
          description={
            filter === 'ALL'
              ? 'Os conteúdos aparecem aqui quando as creators aprovadas os enviarem.'
              : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((sub) => (
            <SubmissionCard
              key={sub.id}
              submission={sub}
              onApprove={() => approve.mutate(sub.id)}
              onReject={() => reject.mutate(sub.id)}
              onRevision={() => setRevisionTarget(sub.id)}
              isApproving={approve.isPending && approve.variables === sub.id}
              isRejecting={reject.isPending && reject.variables === sub.id}
            />
          ))}
        </div>
      )}

      {/* Modal de revisão */}
      {revisionTarget && (
        <RevisionModal
          submissionId={revisionTarget}
          isPending={revision.isPending}
          onConfirm={(id, feedback) => {
            revision.mutate(
              { id, feedback },
              { onSuccess: () => setRevisionTarget(null) },
            );
          }}
          onCancel={() => setRevisionTarget(null)}
        />
      )}
    </div>
  );
}
