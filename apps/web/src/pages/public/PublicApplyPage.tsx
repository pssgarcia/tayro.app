import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, CalendarDays } from 'lucide-react';
import { api } from '../../services/api';
import type { Campaign } from '../../types/api';
import { formatCurrency } from '../../utils/format';
import Plate from '../../components/primitives/Plate';
import CountUp from '../../components/primitives/CountUp';
import PlateField from '../../components/primitives/PlateField';
import PlateTextarea from '../../components/primitives/PlateTextarea';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** ISO → "25 de junho de 2026" — mês por extenso, só usado nessa tela. */
function formatDateLong(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
}

// ─── Schema Zod ───────────────────────────────────────────────────────────────

const schema = z.object({
  igHandle: z
    .string()
    .min(1, 'Informe seu @ do Instagram')
    .transform((v) => v.replace(/^@+/, '').toLowerCase().trim())
    .pipe(
      z
        .string()
        .max(30, 'Handle muito longo')
        .regex(/^[a-zA-Z0-9_.]{1,30}$/, 'Handle inválido — só letras, números, . e _'),
    ),
  email: z.string().email('E-mail inválido'),
  name: z.string().optional(),
  message: z.string().max(1000).optional(),
});

type FormValues = z.infer<typeof schema>;

// ─── Estado pós-submit ────────────────────────────────────────────────────────

type SubmitState =
  | { kind: 'idle' }
  | { kind: 'success'; brandName: string }
  | { kind: 'conflict'; message: string }
  | { kind: 'throttled' }
  | { kind: 'error' };

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded bg-secondary" />
        <div className="space-y-2">
          <div className="h-3 w-20 rounded bg-secondary" />
          <div className="h-4 w-32 rounded bg-secondary" />
        </div>
      </div>
      <div className="h-[88px] rounded-lg bg-secondary" />
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-secondary" />
        <div className="h-3 w-4/5 rounded bg-secondary" />
      </div>
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────
// Tela 4 do redesign 2a — a mais importante das 16 (é a de conversão). Uma
// placa só: enquanto não envia, carrega a oferta; depois de enviar, ela
// mesma vira a confirmação (regra 5 — uma placa, um job).

export default function PublicApplyPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [submitState, setSubmitState] = useState<SubmitState>({ kind: 'idle' });

  const { data: campaign, isLoading, isError } = useQuery({
    queryKey: ['campaign', 'public', id],
    queryFn: () => api.get<Campaign>(`/campaigns/${id}`).then((r) => r.data),
    enabled: !!id,
    retry: 1,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setSubmitState({ kind: 'idle' });
    try {
      await api.post(`/programs/${id}/apply/public`, {
        igHandle: values.igHandle,
        email: values.email,
        name: values.name || undefined,
        message: values.message || undefined,
      });
      setSubmitState({ kind: 'success', brandName: campaign?.brand?.name ?? 'A marca' });
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: { message?: string } } })
        ?.response?.status;
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;

      if (status === 429) {
        setSubmitState({ kind: 'throttled' });
      } else if (status === 409) {
        setSubmitState({
          kind: 'conflict',
          message:
            typeof msg === 'string' && msg.length < 120
              ? msg
              : 'Você já se candidatou ou este e-mail já está em uso.',
        });
      } else {
        setSubmitState({ kind: 'error' });
      }
    }
  }

  const isSuccess = submitState.kind === 'success';
  const initials = (campaign?.brand?.name ?? '')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-[60px] items-center justify-between px-6">
        <Link
          to="/login"
          className="font-display text-[19px] font-bold tracking-[-.05em] text-foreground hover:opacity-80 transition-opacity"
        >
          tay<span className="text-lime">ro</span>
        </Link>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-[7px] text-[13px] text-[#75756E] transition-colors hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Voltar
        </button>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-10">
        {isLoading && <PageSkeleton />}

        {isError && (
          <div className="py-16 text-center">
            <p className="font-display font-semibold text-foreground">Programa não encontrado</p>
            <p className="mt-1 text-sm text-[#75756E]">
              O link pode estar desatualizado ou o programa foi encerrado.
            </p>
          </div>
        )}

        {campaign && (
          <div className="max-w-[520px]">
            {/* Marca */}
            <div className="mb-[22px] flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[4px] bg-muted">
                {campaign.brand?.logoUrl ? (
                  <img src={campaign.brand.logoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="font-mono text-[13px] text-[#75756E]">{initials}</span>
                )}
              </div>
              <div>
                <p className="text-xs text-[#75756E]">Programa de</p>
                <p className="mt-[3px] font-display text-[15px] font-semibold tracking-[-.025em] text-foreground">
                  {campaign.brand?.name ?? '—'}
                </p>
              </div>
            </div>

            <h1 className="mb-[26px] font-display text-d-md leading-none text-foreground">
              {campaign.title}
            </h1>

            {/* Placa — oferta, ou (depois de enviar) confirmação */}
            <Plate marks="all">
              {isSuccess ? (
                <>
                  <p className="font-display text-d-lg text-plate-ink">Candidatura enviada</p>
                  <div className="mt-5 flex flex-col gap-2 text-[13px] leading-[1.5] text-plate-muted">
                    <p>
                      <span className="font-medium text-plate-body">{submitState.brandName}</span> vai
                      analisar seu perfil do Instagram.
                    </p>
                    <p>Você recebe a decisão por e-mail.</p>
                    <p>Se aprovada, os detalhes da parceria chegam por lá.</p>
                  </div>
                </>
              ) : (
                <>
                  <p className="mb-3 font-mono text-[9px] uppercase tracking-[.16em] text-plate-muted">
                    O que você recebe
                  </p>
                  <p className="font-display text-[26px] font-bold leading-[1.04] tracking-[-.045em] text-plate-ink">
                    {campaign.offerType === 'CASH' && campaign.offerAmount != null
                      ? formatCurrency(campaign.offerAmount)
                      : (campaign.offerDescription ?? '—')}
                  </p>
                  <p className="mt-2.5 text-xs text-plate-muted">
                    {campaign.offerType === 'CASH' ? 'por candidatura aprovada' : 'produto enviado para você'}
                  </p>

                  {campaign.offerDeadlineDays != null && (
                    <>
                      <div className="mb-5 mt-[22px] h-px bg-plate-line" />
                      <div className="flex gap-[30px]">
                        <div>
                          <CountUp>
                            <span className="font-display text-d-xl text-plate-ink tabular-nums">
                              {campaign.offerDeadlineDays}
                            </span>
                          </CountUp>
                          <p className="mt-3 text-xs text-plate-soft">
                            {campaign.offerType === 'CASH' ? 'dias até o pagamento' : 'dias até o envio'}
                          </p>
                        </div>
                        <div>
                          <CountUp delay={140}>
                            <span className="font-display text-d-xl text-plate-ink tabular-nums">
                              {campaign.maxSpots}
                            </span>
                          </CountUp>
                          <p className="mt-3 text-xs text-plate-soft">vagas abertas</p>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </Plate>

            {!isSuccess && (
              <>
                {campaign.deadline && (
                  <p className="mt-[22px] flex items-center gap-2 text-xs text-[#75756E]">
                    <CalendarDays size={13} />
                    Inscrições até {formatDateLong(campaign.deadline)}
                  </p>
                )}

                {campaign.niches.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-[7px]">
                    {campaign.niches.map((n) => (
                      <span
                        key={n}
                        className="rounded-[3px] border border-[#232323] px-[9px] py-[5px] text-[11px] capitalize text-[#8A8A85]"
                      >
                        {n}
                      </span>
                    ))}
                  </div>
                )}

                <p className="mt-[18px] whitespace-pre-line break-words text-sm leading-[1.55] text-[#8A8A85]">
                  {campaign.description}
                </p>

                <div className="my-[30px] h-px bg-muted" />

                {campaign.status !== 'ACTIVE' ? (
                  <p className="text-sm text-[#75756E]">Inscrições encerradas para este programa.</p>
                ) : (
                  <form onSubmit={handleSubmit(onSubmit)} noValidate>
                    <h2 className="font-display text-d-xs text-foreground">Quero participar</h2>
                    <p className="mb-[26px] mt-[6px] text-[13px] text-[#75756E]">
                      Leva menos de 1 minuto.
                    </p>

                    <div className="flex flex-col gap-6">
                      <PlateField
                        label="Seu @ do Instagram"
                        required
                        prefix="@"
                        placeholder="seuhandle"
                        autoComplete="off"
                        autoCapitalize="none"
                        autoCorrect="off"
                        error={errors.igHandle?.message}
                        {...register('igHandle')}
                      />
                      <PlateField
                        label="E-mail"
                        required
                        type="email"
                        placeholder="seu@email.com"
                        autoComplete="email"
                        error={errors.email?.message}
                        {...register('email')}
                      />
                      <PlateField
                        label="Seu nome (opcional)"
                        placeholder="Como você se chama?"
                        autoComplete="name"
                        error={errors.name?.message}
                        {...register('name')}
                      />
                      <PlateTextarea
                        label="Mensagem para a marca (opcional)"
                        placeholder="Por que você é ideal para esse programa?"
                        error={errors.message?.message}
                        {...register('message')}
                      />
                    </div>

                    {submitState.kind === 'conflict' && (
                      <p className="mt-6 text-sm text-destructive">{submitState.message}</p>
                    )}
                    {submitState.kind === 'throttled' && (
                      <p className="mt-6 text-sm text-destructive">
                        Muitas tentativas. Aguarde alguns minutos e tente de novo.
                      </p>
                    )}
                    {submitState.kind === 'error' && (
                      <p className="mt-6 text-sm text-destructive">
                        Algo deu errado. Verifique os dados e tente novamente.
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="mt-[30px] min-h-[52px] w-full rounded-lg bg-lime text-[15px] font-semibold tracking-[-.02em] text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSubmitting ? 'Enviando…' : 'Quero participar'}
                    </button>

                    <p className="mt-4 text-center text-[11px] leading-[1.5] text-[#6E6E68]">
                      Ao enviar, você concorda que seus dados de perfil do Instagram sejam
                      consultados pela marca.
                    </p>
                  </form>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
