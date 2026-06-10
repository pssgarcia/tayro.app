import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarDays, CheckCircle2, Sparkles } from 'lucide-react';
import { api } from '../../services/api';
import type { Campaign } from '../../types/api';
import Avatar from '../../components/primitives/Avatar';
import { cn } from '../../lib/utils';

// ─── Helpers de formatação ────────────────────────────────────────────────────

function formatCurrency(centavos: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    centavos / 100,
  );
}

function formatDate(iso: string): string {
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

// ─── Sub-componentes locais ───────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-destructive">{message}</p>;
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-xs font-medium text-foreground">
      {children}
      {required && <span className="ml-0.5 text-destructive">*</span>}
    </label>
  );
}

function Input({
  className,
  prefix,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { prefix?: string }) {
  return (
    <div className="relative">
      {prefix && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 select-none text-sm text-muted-foreground">
          {prefix}
        </span>
      )}
      <input
        {...props}
        className={cn(
          'w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-lime/50 focus:outline-none focus:ring-1 focus:ring-lime/30',
          prefix && 'pl-7',
          className,
        )}
      />
    </div>
  );
}

// ─── Tela de sucesso ──────────────────────────────────────────────────────────

function SuccessScreen({ brandName }: { brandName: string }) {
  return (
    <div className="flex flex-col items-center gap-5 py-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-lime/10">
        <CheckCircle2 size={32} className="text-lime" />
      </div>
      <div className="space-y-2">
        <p className="font-display text-xl font-bold">Candidatura enviada!</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{brandName}</span> vai analisar seu perfil
          e você receberá uma notificação por e-mail.
        </p>
      </div>
      <div className="w-full max-w-xs rounded-xl border border-lime/20 bg-lime/5 p-4 text-left">
        <p className="text-xs font-semibold text-lime">O que vem a seguir</p>
        <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
          <li>· Analisamos seu perfil do Instagram</li>
          <li>· Você receberá um e-mail com a decisão</li>
          <li>· Se aprovada, os detalhes da parceria chegam por lá</li>
        </ul>
      </div>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-14 w-14 rounded-full bg-secondary" />
        <div className="space-y-2">
          <div className="h-3 w-24 rounded bg-secondary" />
          <div className="h-5 w-48 rounded bg-secondary" />
        </div>
      </div>
      <div className="h-20 rounded-xl bg-secondary" />
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-secondary" />
        <div className="h-3 w-4/5 rounded bg-secondary" />
        <div className="h-3 w-3/5 rounded bg-secondary" />
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function PublicApplyPage() {
  const { id } = useParams<{ id: string }>();
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

  // ── Layout shell ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* Header público — só logo */}
      <header className="border-b border-border px-6 py-4">
        <span className="font-display text-xl font-bold tracking-tight">
          tay<span className="text-lime">ro</span>
        </span>
      </header>

      <main className="mx-auto max-w-lg px-6 py-10">
        {isLoading && <PageSkeleton />}

        {isError && (
          <div className="py-16 text-center">
            <p className="font-display font-semibold">Programa não encontrado</p>
            <p className="mt-1 text-sm text-muted-foreground">
              O link pode estar desatualizado ou o programa foi encerrado.
            </p>
          </div>
        )}

        {campaign && (
          <div className="space-y-8">
            {/* Bloco do programa */}
            <div className="space-y-5">
              {/* Marca */}
              <div className="flex items-center gap-3">
                <Avatar src={campaign.brand?.logoUrl} name={campaign.brand?.name} size="lg" />
                <div>
                  <p className="text-xs text-muted-foreground">Programa de</p>
                  <p className="font-display text-base font-semibold">
                    {campaign.brand?.name ?? '—'}
                  </p>
                </div>
              </div>

              {/* Título */}
              <h1 className="font-display text-2xl font-bold leading-snug">{campaign.title}</h1>

              {/* Oferta em destaque */}
              {campaign.offerType && (
                <div className="rounded-xl border border-lime/20 bg-lime/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-lime/70">
                    O que você recebe
                  </p>
                  <p className="mt-1 font-display text-2xl font-bold text-lime">
                    {campaign.offerType === 'CASH' && campaign.offerAmount != null
                      ? formatCurrency(campaign.offerAmount)
                      : campaign.offerDescription ?? '—'}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {campaign.offerType === 'CASH' ? 'por creator aprovada' : 'produto enviado para você'}
                  </p>
                  {campaign.offerDeadlineDays != null && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {campaign.offerType === 'CASH' ? 'Pago' : 'Enviado'} em até{' '}
                      <span className="font-medium text-foreground">
                        {campaign.offerDeadlineDays} dias
                      </span>{' '}
                      após aprovação da candidatura
                    </p>
                  )}
                </div>
              )}

              {/* Meta / prazo / niches */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                {campaign.deadline && (
                  <span className="flex items-center gap-1.5">
                    <CalendarDays size={12} />
                    Inscrições até {formatDate(campaign.deadline)}
                  </span>
                )}
                {campaign.maxSpots && (
                  <span className="flex items-center gap-1.5">
                    <Sparkles size={12} />
                    {campaign.maxSpots} vaga{campaign.maxSpots !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Niches */}
              {campaign.niches.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {campaign.niches.map((n) => (
                    <span
                      key={n}
                      className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium capitalize text-muted-foreground"
                    >
                      {n}
                    </span>
                  ))}
                </div>
              )}

              {/* Descrição */}
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                {campaign.description}
              </p>
            </div>

            {/* Divisor */}
            <div className="border-t border-border" />

            {/* Programa encerrado */}
            {campaign.status !== 'ACTIVE' && (
              <div className="rounded-xl border border-border bg-secondary px-5 py-4 text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  Inscrições encerradas para este programa.
                </p>
              </div>
            )}

            {/* Formulário — só quando ACTIVE */}
            {campaign.status === 'ACTIVE' && (
              <>
                {submitState.kind === 'success' ? (
                  <SuccessScreen brandName={submitState.brandName} />
                ) : (
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    <div>
                      <p className="font-display text-lg font-semibold">Quero participar</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        Conta um pouco sobre você — leva menos de 1 minuto.
                      </p>
                    </div>

                    <div>
                      <Label required>Seu @ do Instagram</Label>
                      <Input
                        {...register('igHandle')}
                        prefix="@"
                        placeholder="seuhandle"
                        autoComplete="off"
                        autoCapitalize="none"
                      />
                      <FieldError message={errors.igHandle?.message} />
                    </div>

                    <div>
                      <Label required>E-mail</Label>
                      <Input
                        {...register('email')}
                        type="email"
                        placeholder="seu@email.com"
                        autoComplete="email"
                      />
                      <FieldError message={errors.email?.message} />
                    </div>

                    <div>
                      <Label>Seu nome (opcional)</Label>
                      <Input
                        {...register('name')}
                        placeholder="Como você se chama?"
                        autoComplete="name"
                      />
                      <FieldError message={errors.name?.message} />
                    </div>

                    <div>
                      <Label>Mensagem para a marca (opcional)</Label>
                      <textarea
                        {...register('message')}
                        rows={3}
                        placeholder="Por que você seria perfeita para esse programa?"
                        className="w-full resize-none rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-lime/50 focus:outline-none focus:ring-1 focus:ring-lime/30"
                      />
                      <FieldError message={errors.message?.message} />
                    </div>

                    {/* Feedback de erro pós-submit */}
                    {submitState.kind === 'conflict' && (
                      <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
                        <p className="text-sm text-destructive">{submitState.message}</p>
                      </div>
                    )}
                    {submitState.kind === 'throttled' && (
                      <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-3">
                        <p className="text-sm text-orange-400">
                          Muitas tentativas. Aguarde alguns minutos e tente de novo.
                        </p>
                      </div>
                    )}
                    {submitState.kind === 'error' && (
                      <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
                        <p className="text-sm text-destructive">
                          Algo deu errado. Verifique os dados e tente novamente.
                        </p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full rounded-lg bg-lime py-3 font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      {isSubmitting ? 'Enviando…' : 'Quero participar'}
                    </button>

                    <p className="text-center text-xs text-muted-foreground">
                      Ao enviar, você concorda que seus dados de perfil do Instagram sejam
                      consultados pela marca para avaliação.
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
