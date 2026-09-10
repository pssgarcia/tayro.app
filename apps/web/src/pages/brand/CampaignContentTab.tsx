import { useMemo, useState } from 'react';
import { ExternalLink, Layers } from 'lucide-react';
import type { CampaignSubmission, ContentStatus } from '../../types/api';
import {
  useCampaignSubmissions,
  useApproveSubmission,
  useRejectSubmission,
  useRequestRevision,
} from '../../hooks/useCampaignApplications';
import EmptyState from '../../components/primitives/EmptyState';
import KineticPlate from '../../components/primitives/kinetic/KineticPlate';
import KineticActions from '../../components/primitives/kinetic/KineticActions';
import KineticRow from '../../components/primitives/kinetic/KineticRow';
import KineticFact from '../../components/primitives/kinetic/KineticFact';
import StatusWord from '../../components/primitives/kinetic/StatusWord';
import { contentStatusWord, creatorAvatarSrc } from '../../utils/format';
import { cn } from '../../lib/utils';
import { useT } from '../../i18n';

// ─── Aba Entregas ────────────────────────────────────────────────────────────
// Migrada pro "Kinetic Editorial". Era a tela mais fora do sistema do produto
// inteiro: nunca passou nem pelo 2a — `rounded-xl border bg-card`, pills
// `bg-yellow-500/10 + border-yellow-500/20` e botão `bg-blue-600`, três coisas
// que o DESIGN.md lista explicitamente como "Don't".
//
// Adota o par lista + placa que a Fila provou: a lista mostra TODA entrega e a
// placa abre a selecionada com espaço pra legenda e feedback. No celular a
// lista vem primeiro e a placa logo abaixo (tocar numa linha atualiza a placa
// que já está no campo de visão); no desktop a placa vai pra esquerda.

// Só os valores: o rótulo vem do dicionário no render.
const FILTER_VALUES = [
  'ALL',
  'PENDING',
  'APPROVED',
  'REJECTED',
  'REVISION_REQUESTED',
] as const;

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
  const t = useT();
  const [feedback, setFeedback] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
      <div className="w-full sm:max-w-md">
        <KineticPlate marks="top" flush className="rounded-b-none sm:rounded-b-lg">
          <div className="px-6 pb-7 pt-11">
            <h3 className="font-display text-xl font-bold tracking-[-.04em] text-black">
              {t.app.marca.entregas.solicitarRevisao}
            </h3>
            <p className="mt-2 text-[13px] leading-[1.5] text-[#6a6a64]">
              {t.app.marca.entregas.solicitarRevisaoDescricao}
            </p>
            <textarea
              autoFocus
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              placeholder={t.app.marca.entregas.revisaoPlaceholder}
              className="mt-5 w-full resize-none border-b border-[#b8b8b1] bg-transparent pb-2 text-sm text-black placeholder:text-[#8a8a84] focus:border-black focus:outline-none"
            />
          </div>
          <KineticActions
            actions={[
              { label: t.app.acoes.cancelar, onClick: onCancel, width: 130 },
              {
                label: isPending ? t.app.marca.entregas.enviando : t.app.marca.entregas.solicitarRevisao,
                onClick: () => feedback.trim() && onConfirm(submissionId, feedback.trim()),
                disabled: !feedback.trim() || isPending,
                primary: true,
              },
            ]}
          />
        </KineticPlate>
      </div>
    </div>
  );
}

// ─── Placa: a entrega selecionada ─────────────────────────────────────────────

function SubmissionPlate({
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
  const t = useT();
  const { influencer } = submission;
  const avatarSrc = creatorAvatarSrc(influencer);
  const isPending = submission.status === 'PENDING';

  return (
    <KineticPlate as="section" marks="all" flush>
      <div className="px-6 pb-8 pt-11 sm:px-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={influencer.name}
                className="h-14 w-14 shrink-0 rounded object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-[#cfcfc8] font-display text-lg font-bold text-[#6a6a64]">
                {influencer.name[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate font-display text-xl font-bold tracking-[-.04em] text-black">
                {influencer.name}
              </p>
              {influencer.instagramHandle && (
                <p className="mt-1 truncate font-mono text-[13px] text-[#6a6a64]">
                  @{influencer.instagramHandle}
                </p>
              )}
            </div>
          </div>
          <span className="shrink-0 font-mono text-[11px] uppercase tracking-widest text-[#6a6a64]">
            {/* Fonte única do vocabulário (`utils/format.ts`), em vez de um
                ternário repetindo os rótulos aqui. */}
            {contentStatusWord(submission.status)}
          </span>
        </div>

        <div className="my-7 h-px bg-[#c9c9c3]" />

        <div className="flex items-end justify-between gap-4">
          <KineticFact label={t.app.marca.entregas.tipo} value={submission.mediaType} tone="plate" />
          <a
            href={submission.mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-[#4a4a44] underline-offset-4 transition-colors hover:text-black hover:underline"
          >
            {t.app.marca.entregas.verConteudo}
            <ExternalLink size={12} />
          </a>
        </div>

        {submission.caption && (
          <div className="mt-7">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-[#6a6a64]">
              {t.app.marca.entregas.legendaEnviada}
            </p>
            <p className="whitespace-pre-line break-words text-sm leading-relaxed text-[#3a3a34]">
              {submission.caption}
            </p>
          </div>
        )}

        {submission.feedback && (
          <div className="mt-7 border-l-2 border-[#b8b8b1] pl-4">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-[#6a6a64]">
              {t.app.marca.entregas.feedbackEnviado}
            </p>
            <p className="break-words text-sm leading-relaxed text-[#3a3a34]">
              {submission.feedback}
            </p>
          </div>
        )}
      </div>

      {isPending && (
        <KineticActions
          actions={[
            {
              label: isApproving ? t.app.marca.entregas.aprovando : t.app.marca.entregas.aprovar,
              onClick: onApprove,
              disabled: isApproving || isRejecting,
              primary: true,
            },
            { label: t.app.marca.entregas.abas.REVISION_REQUESTED, onClick: onRevision, disabled: isApproving || isRejecting },
            {
              label: isRejecting ? t.app.marca.entregas.recusando : t.app.marca.entregas.recusar,
              onClick: onReject,
              disabled: isApproving || isRejecting,
            },
          ]}
        />
      )}
    </KineticPlate>
  );
}

// ─── Aba ──────────────────────────────────────────────────────────────────────

export default function CampaignContentTab({ campaignId }: { campaignId: string }) {
  const t = useT();
  const [filter, setFilter] = useState<'ALL' | ContentStatus>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [revisionTarget, setRevisionTarget] = useState<string | null>(null);

  const { data: submissions = [], isLoading } = useCampaignSubmissions(campaignId);
  const approve = useApproveSubmission(campaignId);
  const reject = useRejectSubmission(campaignId);
  const revision = useRequestRevision(campaignId);

  const visible = useMemo(
    () => (filter === 'ALL' ? submissions : submissions.filter((s) => s.status === filter)),
    [submissions, filter],
  );

  // A seleção segue a lista filtrada: se a entrega aberta sai do filtro, a
  // placa passa pra primeira visível em vez de ficar mostrando algo que a
  // lista ao lado não contém mais.
  const selected = visible.find((s) => s.id === selectedId) ?? visible[0] ?? null;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl animate-pulse px-4 pb-12 sm:px-6">
        <div className="h-8 w-64 rounded bg-kinetic-dark" />
        <div className="mt-8 flex flex-col gap-8 lg:flex-row">
          <div className="h-[360px] flex-1 rounded-lg bg-kinetic-dark" />
          <div className="w-full space-y-2 lg:w-[340px]">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 rounded bg-kinetic-dark" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-12 sm:px-6">
      <div className="flex flex-wrap gap-2">
        {FILTER_VALUES.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={cn(
              'border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[.12em] transition-colors',
              filter === value
                ? 'border-lime text-lime'
                : 'border-kinetic-gray text-kinetic-muted hover:text-foreground',
            )}
          >
            {t.app.marca.entregas.abas[value]}
            {value === 'ALL' && (
              <span className="ml-2 tabular-nums text-kinetic-muted">{submissions.length}</span>
            )}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={<Layers size={20} />}
            title={
              filter === 'ALL' ? t.app.marca.entregas.vazio : t.app.marca.entregas.vazioComFiltro
            }
            description={
              filter === 'ALL' ? t.app.marca.entregas.vazioDescricao : undefined
            }
          />
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start">
          {/* Lista primeiro no DOM: no celular ela fica acima da placa, então
              tocar numa linha atualiza uma placa que já está à vista. */}
          <aside className="w-full lg:order-2 lg:w-[340px] lg:shrink-0">
            <p className="mb-5 font-mono text-[11px] uppercase tracking-widest text-kinetic-muted">
              {t.app.marca.entregas.titulo} · {visible.length}
            </p>
            <ul aria-label={t.app.marca.entregas.titulo} className="flex flex-col gap-0.5">
              {visible.map((sub) => {
                const rowAvatar = creatorAvatarSrc(sub.influencer);
                return (
                  <li key={sub.id}>
                    <KineticRow
                      title={sub.influencer.name}
                      meta={sub.mediaType}
                      selected={selected?.id === sub.id}
                      onClick={() => setSelectedId(sub.id)}
                      leading={
                        <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-kinetic-gray">
                          {rowAvatar && (
                            <img src={rowAvatar} alt="" className="h-full w-full object-cover" />
                          )}
                        </span>
                      }
                      trailing={<StatusWord kind="content" status={sub.status} />}
                    />
                  </li>
                );
              })}
            </ul>
          </aside>

          <div className="min-w-0 flex-1 lg:order-1">
            {selected && (
              <SubmissionPlate
                submission={selected}
                onApprove={() => approve.mutate(selected.id)}
                onReject={() => reject.mutate(selected.id)}
                onRevision={() => setRevisionTarget(selected.id)}
                isApproving={approve.isPending && approve.variables === selected.id}
                isRejecting={reject.isPending && reject.variables === selected.id}
              />
            )}
          </div>
        </div>
      )}

      {revisionTarget && (
        <RevisionModal
          submissionId={revisionTarget}
          isPending={revision.isPending}
          onConfirm={(id, feedback) => {
            revision.mutate({ id, feedback }, { onSuccess: () => setRevisionTarget(null) });
          }}
          onCancel={() => setRevisionTarget(null)}
        />
      )}
    </div>
  );
}
