import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ExternalLink, Video, X } from 'lucide-react';
import axios from 'axios';
import { useMyApplications } from '../../hooks/useMyApplications';
import {
  useMySubmissions,
  useCreateSubmission,
} from '../../hooks/useMySubmissions';
import type { ContentStatus, MediaType } from '../../types/api';
import { formatDate } from '../../utils/format';
import { cn } from '../../lib/utils';

// ─── Status ───────────────────────────────────────────────────────────────────

const CONTENT_STATUS: Record<ContentStatus, { label: string; cls: string }> = {
  PENDING:            { label: 'Em análise',  cls: 'bg-amber-500/10 text-amber-400' },
  APPROVED:           { label: 'Aprovado',    cls: 'bg-lime/10 text-lime' },
  REJECTED:           { label: 'Recusado',    cls: 'bg-destructive/10 text-destructive' },
  REVISION_REQUESTED: { label: 'Revisar',     cls: 'bg-orange-500/10 text-orange-400' },
};

const MEDIA_LABELS: Record<MediaType, string> = {
  IMAGE: 'Foto',
  VIDEO: 'Vídeo',
  REEL:  'Reel',
  STORY: 'Story',
};

// ─── Schema Zod ───────────────────────────────────────────────────────────────

const schema = z.object({
  applicationId: z.string().uuid('Selecione uma candidatura aprovada'),
  mediaUrl: z
    .string()
    .url('URL inválida — inclua https://')
    .max(2048, 'URL muito longa'),
  mediaType: z.enum(['IMAGE', 'VIDEO', 'REEL', 'STORY'] as const),
  caption: z.string().max(2200, 'Máximo 2200 caracteres').optional(),
});

type FormValues = z.infer<typeof schema>;

// ─── Modal de envio ───────────────────────────────────────────────────────────

function SubmitModal({
  defaultApplicationId,
  onClose,
}: {
  defaultApplicationId?: string;
  onClose: () => void;
}) {
  const { data: applications = [] } = useMyApplications();
  const create = useCreateSubmission();

  const approvedApps = applications.filter((a) => a.status === 'APPROVED');

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      applicationId: defaultApplicationId ?? '',
      mediaType: 'REEL',
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      await create.mutateAsync({
        applicationId: values.applicationId,
        mediaUrl: values.mediaUrl,
        mediaType: values.mediaType,
        caption: values.caption || undefined,
      });
      onClose();
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : null;
      const msg =
        axios.isAxiosError(err) && typeof err.response?.data?.message === 'string'
          ? err.response.data.message
          : null;

      if (status === 400 && msg) {
        setError('root', { message: msg });
      } else if (status === 403) {
        setError('root', { message: 'Essa candidatura não é sua ou não está aprovada.' });
      } else {
        setError('root', { message: 'Não foi possível enviar. Tente novamente.' });
      }
    }
  }

  const inputCls = (hasError: boolean) =>
    cn(
      'w-full rounded-lg border bg-secondary px-3 py-2 text-sm text-foreground',
      'placeholder:text-muted-foreground focus:outline-none focus:ring-1',
      hasError
        ? 'border-destructive focus:border-destructive focus:ring-destructive/30'
        : 'border-border focus:border-lime/50 focus:ring-lime/30',
    );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl border border-border bg-card p-6 sm:rounded-2xl">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Enviar conteúdo</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        {approvedApps.length === 0 ? (
          <div className="py-4 text-center">
            <p className="text-sm text-muted-foreground">
              Você não tem candidaturas aprovadas no momento.{' '}
              <Link to="/influencer/applications" className="text-lime hover:underline">
                Ver candidaturas
              </Link>
              .
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {errors.root && (
              <div className="rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-3">
                <p className="text-sm text-destructive">{errors.root.message}</p>
              </div>
            )}

            {/* Candidatura */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground">
                Candidatura aprovada <span className="text-destructive">*</span>
              </label>
              <select
                {...register('applicationId')}
                className={inputCls(!!errors.applicationId)}
              >
                <option value="">Selecione…</option>
                {approvedApps.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.campaign.title} — {a.campaign.brand.name}
                  </option>
                ))}
              </select>
              {errors.applicationId && (
                <p className="mt-1 text-xs text-destructive">{errors.applicationId.message}</p>
              )}
            </div>

            {/* URL do conteúdo */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground">
                Link do conteúdo <span className="text-destructive">*</span>
              </label>
              <input
                {...register('mediaUrl')}
                type="url"
                placeholder="https://instagram.com/reel/..."
                className={inputCls(!!errors.mediaUrl)}
              />
              {errors.mediaUrl && (
                <p className="mt-1 text-xs text-destructive">{errors.mediaUrl.message}</p>
              )}
            </div>

            {/* Tipo de mídia */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground">
                Tipo de conteúdo <span className="text-destructive">*</span>
              </label>
              <select {...register('mediaType')} className={inputCls(!!errors.mediaType)}>
                <option value="REEL">Reel</option>
                <option value="VIDEO">Vídeo</option>
                <option value="IMAGE">Foto</option>
                <option value="STORY">Story</option>
              </select>
            </div>

            {/* Legenda */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground">
                Legenda <span className="text-muted-foreground">(opcional)</span>
              </label>
              <textarea
                {...register('caption')}
                rows={3}
                placeholder="Cole aqui a legenda do post…"
                className={cn(inputCls(!!errors.caption), 'resize-none')}
              />
              {errors.caption && (
                <p className="mt-1 text-xs text-destructive">{errors.caption.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[44px] rounded-lg bg-lime py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? 'Enviando…' : 'Enviar conteúdo'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Card de conteúdo enviado ─────────────────────────────────────────────────

function SubmissionCard({ s }: { s: ReturnType<typeof useMySubmissions>['data'] extends (infer T)[] | undefined ? T : never }) {
  const { label, cls } = CONTENT_STATUS[s.status];

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{s.application.campaign.brand.name}</p>
          <p className="truncate text-sm font-medium">{s.application.campaign.title}</p>
        </div>
        <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium', cls)}>
          {label}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          {MEDIA_LABELS[s.mediaType]}
        </span>
        <a
          href={s.mediaUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Ver conteúdo <ExternalLink size={11} />
        </a>
      </div>

      {s.caption && (
        <p className="line-clamp-2 text-xs text-muted-foreground">{s.caption}</p>
      )}

      {(s.status === 'REJECTED' || s.status === 'REVISION_REQUESTED') && s.feedback && (
        <div className="rounded-lg border border-border bg-secondary/50 px-3 py-2">
          <p className="text-xs font-medium text-foreground">Feedback da marca</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{s.feedback}</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Enviado {formatDate(s.submittedAt, '—')}
      </p>
    </div>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-32 animate-pulse rounded-xl border border-border bg-card" />
      ))}
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function SubmissionsPage() {
  const [searchParams] = useSearchParams();
  const fromApplicationId = searchParams.get('apply') ?? undefined;

  const [modalOpen, setModalOpen] = useState(() => !!fromApplicationId);

  const { data: submissions = [], isLoading, isError } = useMySubmissions();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold sm:text-2xl">Meus conteúdos</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Conteúdos enviados para avaliação das marcas
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="shrink-0 rounded-lg bg-lime px-4 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90"
        >
          Enviar conteúdo
        </button>
      </div>

      {isLoading && <Skeleton />}

      {isError && (
        <p className="text-sm text-destructive">Erro ao carregar. Tente novamente.</p>
      )}

      {!isLoading && !isError && submissions.length === 0 && (
        <div className="rounded-xl border border-border bg-card px-5 py-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
            <Video size={20} className="text-muted-foreground" />
          </div>
          <p className="font-display text-sm font-semibold">Nenhum conteúdo enviado</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Quando você tiver uma candidatura aprovada, envie o link do seu conteúdo aqui.
          </p>
        </div>
      )}

      {!isLoading && !isError && submissions.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {submissions.map((s) => (
            <SubmissionCard key={s.id} s={s} />
          ))}
        </div>
      )}

      {modalOpen && (
        <SubmitModal
          defaultApplicationId={fromApplicationId}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
