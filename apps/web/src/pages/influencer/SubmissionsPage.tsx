import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { useMyApplications } from '../../hooks/useMyApplications';
import { useMySubmissions, useCreateSubmission } from '../../hooks/useMySubmissions';
import type { MediaType, MySubmission } from '../../types/api';
import PlateTextarea from '../../components/primitives/PlateTextarea';
import KineticPlate from '../../components/primitives/kinetic/KineticPlate';
import KineticActions from '../../components/primitives/kinetic/KineticActions';
import KineticRow from '../../components/primitives/kinetic/KineticRow';
import StatusWord from '../../components/primitives/kinetic/StatusWord';
import { formatRelativeDays } from '../../utils/format';
import { cn } from '../../lib/utils';

const MEDIA_LABELS: Record<MediaType, string> = {
  IMAGE: 'Foto',
  VIDEO: 'Vídeo',
  REEL: 'Reel',
  STORY: 'Story',
};

// ─── Schema Zod ───────────────────────────────────────────────────────────────

const schema = z.object({
  applicationId: z.string().uuid('Selecione uma candidatura aprovada'),
  mediaUrl: z.string().url('URL inválida — inclua https://').max(2048, 'URL muito longa'),
  mediaType: z.enum(['IMAGE', 'VIDEO', 'REEL', 'STORY'] as const),
  caption: z.string().max(2200, 'Máximo 2200 caracteres').optional(),
});

type FormValues = z.infer<typeof schema>;

// ─── Select no padrão da placa-formulário (só usado aqui, 2x) ────────────────

function PlateSelectField({
  label,
  error,
  id,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string }) {
  const selectId = id ?? (typeof props.name === 'string' ? props.name : undefined);
  return (
    <div>
      <label
        htmlFor={selectId}
        className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-[#6a6a64]"
      >
        {label}
      </label>
      <span
        className={cn(
          'block border-b pb-[9px] transition-colors duration-[140ms]',
          error ? 'border-destructive' : 'border-[#b8b8b1] focus-within:border-black',
        )}
      >
        <select
          id={selectId}
          {...props}
          className="w-full appearance-none bg-transparent text-[15px] leading-none text-black outline-none"
        >
          {children}
        </select>
      </span>
      {error && <span className="mt-1.5 block text-[11px] text-destructive">{error}</span>}
    </div>
  );
}

// ─── Modal de envio — mesmo padrão de placa-formulário do Login ──────────────

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
    defaultValues: { applicationId: defaultApplicationId ?? '', mediaType: 'REEL' },
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
      onClick={onClose}
    >
      <div className="w-full sm:max-w-md" onClick={(e) => e.stopPropagation()}>
        <KineticPlate marks="top" flush className="rounded-b-none sm:rounded-b-lg">
          {approvedApps.length === 0 ? (
            <div className="px-6 pb-[26px] pt-[30px]">
              <p className="font-display text-xl font-bold tracking-[-.04em] text-black">
                Enviar conteúdo
              </p>
              <p className="mt-3 text-[13px] leading-[1.5] text-[#6a6a64]">
                Você não tem candidaturas aprovadas no momento.{' '}
                <Link
                  to="/influencer/applications"
                  className="whitespace-nowrap text-black underline"
                >
                  Ver candidaturas
                </Link>
                .
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="flex flex-col gap-6 px-6 pb-[26px] pt-[30px]">
                <p className="-mb-2 font-display text-xl font-bold tracking-[-.04em] text-black">
                  Enviar conteúdo
                </p>

                <PlateSelectField
                  label="Candidatura aprovada *"
                  error={errors.applicationId?.message}
                  {...register('applicationId')}
                >
                  <option value="">Selecione…</option>
                  {approvedApps.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.campaign.title} — {a.campaign.brand.name}
                    </option>
                  ))}
                </PlateSelectField>

                <PlateTextarea
                  label="Link do conteúdo *"
                  variant="plate"
                  placeholder="https://instagram.com/reel/..."
                  error={errors.mediaUrl?.message}
                  {...register('mediaUrl')}
                />

                <PlateSelectField label="Tipo de conteúdo *" {...register('mediaType')}>
                  <option value="REEL">Reel</option>
                  <option value="VIDEO">Vídeo</option>
                  <option value="IMAGE">Foto</option>
                  <option value="STORY">Story</option>
                </PlateSelectField>

                <PlateTextarea
                  label="Legenda (opcional)"
                  variant="plate"
                  placeholder="Cole aqui a legenda do post…"
                  error={errors.caption?.message}
                  {...register('caption')}
                />

                {errors.root && (
                  <p className="text-[13px] text-destructive">{errors.root.message}</p>
                )}
              </div>

              <KineticActions
                actions={[
                  { label: 'Cancelar', onClick: onClose, width: 130 },
                  {
                    label: isSubmitting ? 'Enviando…' : 'Enviar conteúdo',
                    type: 'submit',
                    disabled: isSubmitting,
                    primary: true,
                  },
                ]}
              />
            </form>
          )}
        </KineticPlate>
      </div>
    </div>
  );
}

// ─── Placa destacada — o que precisa de ação (regra 5) ───────────────────────
// Cascata: 1) revisão/recusa mais recente → "Ver atual" | "Reenviar link";
// 2) sem isso, a última aprovada → "Enviar novo conteúdo" (ação única);
// 3) sem isso (só tem PENDING), a mais recente, sem ação — caso não coberto
// no README, mesma lógica de fallback usada em Registro (passo 11b).

function pickFeatured(
  submissions: MySubmission[],
): { s: MySubmission; mode: 'revise' | 'approved' | 'readonly' } | null {
  const needsAction = submissions.find(
    (s) => s.status === 'REVISION_REQUESTED' || s.status === 'REJECTED',
  );
  if (needsAction) return { s: needsAction, mode: 'revise' };

  const approved = submissions.find((s) => s.status === 'APPROVED');
  if (approved) return { s: approved, mode: 'approved' };

  const [first] = submissions;
  return first ? { s: first, mode: 'readonly' } : null;
}

function FeaturedPlate({
  featured,
  onResend,
}: {
  featured: { s: MySubmission; mode: 'revise' | 'approved' | 'readonly' };
  onResend: () => void;
}) {
  const { s, mode } = featured;

  return (
    <KineticPlate marks="top" flush className="max-w-[520px]">
      <div className="px-6 pb-6 pt-[26px]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#6a6a64]">
              {s.application.campaign.brand.name} · {MEDIA_LABELS[s.mediaType]}
            </p>
            <p className="mt-2 font-display text-[26px] font-bold leading-[1.1] tracking-[-.045em] text-black">
              {s.application.campaign.title}
            </p>
          </div>
          <StatusWord kind="content" status={s.status} />
        </div>

        {s.feedback && mode === 'revise' && (
          <p className="mt-6 text-[15px] leading-[1.5] text-[#3a3a34]">
            &ldquo;{s.feedback}&rdquo;
          </p>
        )}

        <p className="mt-4 text-xs text-[#7a7a74]">{formatRelativeDays(s.submittedAt)}</p>
      </div>

      {mode === 'revise' && (
        <KineticActions
          actions={[
            {
              label: 'Ver atual',
              width: 130,
              onClick: () => window.open(s.mediaUrl, '_blank'),
            },
            { label: 'Reenviar link', onClick: onResend, primary: true },
          ]}
        />
      )}
      {mode === 'approved' && (
        <KineticActions
          actions={[{ label: 'Enviar novo conteúdo', onClick: onResend, primary: true }]}
        />
      )}
    </KineticPlate>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="h-[220px] max-w-[560px] rounded-lg bg-kinetic-dark" />
      <div className="space-y-[22px]">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-14 rounded bg-kinetic-dark" />
        ))}
      </div>
    </div>
  );
}

// ─── Página ──────────────────────────────────────────────────────────────────
// Tela 7 do redesign 2a.

export default function SubmissionsPage() {
  const [searchParams] = useSearchParams();
  const fromApplicationId = searchParams.get('apply') ?? undefined;

  const [modalOpen, setModalOpen] = useState(() => !!fromApplicationId);
  const [modalApplicationId, setModalApplicationId] = useState(fromApplicationId);

  const { data: submissions = [], isLoading, isError } = useMySubmissions();
  const featured = pickFeatured(submissions);

  function openModal(applicationId?: string) {
    setModalApplicationId(applicationId);
    setModalOpen(true);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-12 pt-6 sm:px-6 lg:pt-10">
      <div className="flex items-end justify-between gap-4">
        <h1 className="font-display text-[42px] font-bold leading-[.9] tracking-[-.055em] text-foreground sm:text-[56px] lg:text-[72px]">
          Entregas
        </h1>
        <button
          onClick={() => openModal(undefined)}
          className="flex min-h-[38px] shrink-0 items-center border border-lime px-4 font-mono text-[10px] font-medium uppercase tracking-widest text-lime transition-colors hover:bg-lime hover:text-black"
        >
          Enviar
        </button>
      </div>

      <div className="my-8 h-px bg-kinetic-gray lg:my-10" />

      {isLoading && <Skeleton />}

      {isError && <p className="text-sm text-destructive">Erro ao carregar. Tente novamente.</p>}

      {!isLoading && !isError && submissions.length === 0 && (
        <p className="text-sm text-kinetic-muted">
          Nenhum conteúdo enviado ainda. Quando você tiver uma candidatura aprovada, envie o link do
          seu conteúdo aqui.
        </p>
      )}

      {!isLoading && !isError && submissions.length > 0 && (
        <>
          <p className="mb-4 font-mono text-[11px] uppercase tracking-widest text-kinetic-muted">
            {featured?.mode === 'revise' ? 'A marca pediu ajuste' : 'Precisa de você'}
          </p>
          {featured && (
            <FeaturedPlate
              featured={featured}
              onResend={() => openModal(featured.s.applicationId)}
            />
          )}

          <p className="mb-6 mt-11 font-mono text-[11px] uppercase tracking-widest text-kinetic-muted">
            Enviados
          </p>
          <div className="flex flex-col gap-0.5">
            {submissions.map((s, i) => (
              <KineticRow
                key={s.id}
                index={i + 1}
                title={s.application.campaign.title}
                meta={`${MEDIA_LABELS[s.mediaType]} · ${formatRelativeDays(s.submittedAt)}`}
                trailing={<StatusWord kind="content" status={s.status} />}
              />
            ))}
          </div>
        </>
      )}

      {modalOpen && (
        <SubmitModal
          defaultApplicationId={modalApplicationId}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
