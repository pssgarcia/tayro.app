import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight } from 'lucide-react';
import axios from 'axios';
import { useMyApplications } from '../../hooks/useMyApplications';
import { useMySubmissions, useCreateSubmission } from '../../hooks/useMySubmissions';
import type { MediaType, MySubmission } from '../../types/api';
import Plate from '../../components/primitives/Plate';
import PlateTextarea from '../../components/primitives/PlateTextarea';
import PlateActionBar from '../../components/primitives/PlateActionBar';
import ContentStatusPill from '../../components/primitives/ContentStatusPill';
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
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] text-plate-muted">{label}</span>
      <span
        className={cn(
          'block border-b pb-[9px] transition-colors duration-[140ms]',
          error ? 'border-destructive' : 'border-[rgba(14,14,14,.18)] focus-within:border-plate-ink',
        )}
      >
        <select
          {...props}
          className="w-full appearance-none bg-transparent text-[15px] leading-none text-plate-ink outline-none"
        >
          {children}
        </select>
      </span>
      {error && <span className="mt-1.5 block text-[11px] text-destructive">{error}</span>}
    </label>
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
        <Plate marks="top" flush className="rounded-b-none sm:rounded-b-lg">
          {approvedApps.length === 0 ? (
            <div className="px-6 pb-[26px] pt-[30px]">
              <p className="font-display text-d-xs text-plate-ink">Enviar conteúdo</p>
              <p className="mt-3 text-[13px] text-plate-muted">
                Você não tem candidaturas aprovadas no momento.{' '}
                <Link to="/influencer/applications" className="whitespace-nowrap text-plate-ink underline">
                  Ver candidaturas
                </Link>
                .
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="flex flex-col gap-6 px-6 pb-[26px] pt-[30px]">
                <p className="-mb-2 font-display text-d-xs text-plate-ink">Enviar conteúdo</p>

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

                {errors.root && <p className="text-[13px] text-destructive">{errors.root.message}</p>}
              </div>

              <PlateActionBar
                secondary={{ label: 'Cancelar', onClick: onClose, width: 100 }}
                primary={{
                  label: isSubmitting ? 'Enviando…' : 'Enviar conteúdo',
                  type: 'submit',
                  disabled: isSubmitting,
                  icon: <ArrowRight size={16} />,
                }}
              />
            </form>
          )}
        </Plate>
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
    <Plate marks="top" flush className="max-w-[520px]">
      <div className="px-6 pb-6 pt-[26px]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-plate-muted">
              {s.application.campaign.brand.name} · {MEDIA_LABELS[s.mediaType]}
            </p>
            <p className="mt-[5px] font-display text-[21px] font-bold tracking-[-.045em] text-plate-ink">
              {s.application.campaign.title}
            </p>
          </div>
          <ContentStatusPill status={s.status} className="shrink-0" />
        </div>

        {s.feedback && mode === 'revise' && (
          <p className="mt-[22px] text-[15px] leading-[1.5] text-plate-body">
            &ldquo;{s.feedback}&rdquo;
          </p>
        )}

        <p className="mt-4 text-xs text-plate-soft">{formatRelativeDays(s.submittedAt)}</p>
      </div>

      {mode === 'revise' && (
        <PlateActionBar
          secondary={{ label: 'Ver atual', width: 100, onClick: () => window.open(s.mediaUrl, '_blank') }}
          primary={{ label: 'Reenviar link', onClick: onResend, icon: <ArrowRight size={16} /> }}
        />
      )}
      {mode === 'approved' && (
        <PlateActionBar
          primary={{ label: 'Enviar novo conteúdo', onClick: onResend, icon: <ArrowRight size={16} /> }}
        />
      )}
    </Plate>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="h-[88px] rounded-lg bg-secondary" />
      <div className="space-y-[22px]">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-10 rounded bg-secondary" />
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
    <div className="mx-auto max-w-5xl px-6 pt-[14px]">
      <div className="mb-[26px] flex items-center justify-between">
        <h1 className="font-display text-d-md text-foreground">Entregas</h1>
        <button
          onClick={() => openModal(undefined)}
          className="shrink-0 rounded-lg border border-lime px-[15px] py-[9px] font-display text-[13px] font-semibold tracking-[-.02em] text-lime transition-colors hover:bg-lime/10"
        >
          Enviar
        </button>
      </div>

      {isLoading && <Skeleton />}

      {isError && <p className="text-sm text-destructive">Erro ao carregar. Tente novamente.</p>}

      {!isLoading && !isError && submissions.length === 0 && (
        <p className="text-sm text-[#8A8A85]">
          Nenhum conteúdo enviado ainda. Quando você tiver uma candidatura aprovada, envie o link do
          seu conteúdo aqui.
        </p>
      )}

      {!isLoading && !isError && submissions.length > 0 && (
        <>
          <p className="mb-3.5 text-xs text-[#75756E]">
            {featured?.mode === 'revise' ? 'A marca pediu ajuste' : 'Precisa de você'}
          </p>
          {featured && (
            <FeaturedPlate
              featured={featured}
              onResend={() => openModal(featured.s.applicationId)}
            />
          )}

          <h2 className="mb-5 mt-[34px] font-display text-d-xs text-foreground">Enviados</h2>
          <div className="flex flex-col gap-[22px]">
            {submissions.map((s, i) => (
              <div key={s.id} className="flex items-baseline gap-3.5">
                <span className="shrink-0 font-mono text-[11px] text-[#6E6E68]">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-d-xs font-semibold text-foreground">
                    {s.application.campaign.title}
                  </p>
                  <p className="mt-[5px] text-xs text-[#6E6E68]">
                    {MEDIA_LABELS[s.mediaType]} · {formatRelativeDays(s.submittedAt)}
                  </p>
                </div>
                <ContentStatusPill status={s.status} />
              </div>
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
