import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, CalendarDays } from 'lucide-react';
import { api } from '../../services/api';
import type { Campaign } from '../../types/api';
import {
  formatOffer,
  INSTAGRAM_HANDLE_FORMAT,
  PHONE_FORMAT,
  phoneFormatMessage,
} from '../../utils/format';
import KineticPlate from '../../components/primitives/kinetic/KineticPlate';
import CountUp from '../../components/primitives/CountUp';
import KineticField from '../../components/primitives/kinetic/KineticField';
import KineticTextarea from '../../components/primitives/kinetic/KineticTextarea';
import { useInstagramHandleCheck } from '../../hooks/useInstagramHandleCheck';
import LegalAcceptanceFields from '../../components/legal/LegalAcceptanceFields';
import { useT, type Dictionary } from '../../i18n';

function normalizeHandle(v: string): string {
  return v.replace(/^@+/, '').toLowerCase().trim();
}

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

// Schema é função do dicionário: mensagem fixa no módulo congelaria no
// idioma do boot (ver `i18n/README.md`).
const criarSchema = (t: Dictionary) =>
  z.object({
    igHandle: z
      .string()
      .min(1, t.app.publico.candidatura.handleObrigatorio)
      .transform(normalizeHandle)
      .pipe(
        z
          .string()
          .max(30, t.app.publico.candidatura.handleLongo)
          .regex(INSTAGRAM_HANDLE_FORMAT, t.app.validacao.handleInvalido),
      ),
    email: z.string().email(t.app.validacao.emailInvalido),
    name: z
      .string()
      .trim()
      .min(1, t.app.validacao.nomeObrigatorio)
      .max(100, t.app.publico.candidatura.nomeLongo),
    phone: z
      .string()
      .trim()
      .min(1, t.app.validacao.telefoneObrigatorio)
      .max(20, t.app.validacao.telefoneLongo)
      .regex(PHONE_FORMAT, phoneFormatMessage()),
    message: z.string().max(1000).optional(),
    // Este formulário CRIA (ou reusa) uma conta de creator no TAYRO, então
    // carrega o mesmo aceite dos cadastros. `literal(true)` é o que impede o
    // envio sem marcar; a API repete a exigência (`@Equals(true)`).
    acceptedTermsAndPrivacy: z.literal(true, {
      errorMap: () => ({ message: t.app.validacao.aceiteObrigatorio }),
    }),
    declaredAdult: z.literal(true, {
      errorMap: () => ({ message: t.app.validacao.maioridadeObrigatoria }),
    }),
  });

type FormValues = z.infer<ReturnType<typeof criarSchema>>;

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
        <div className="h-11 w-11 rounded bg-kinetic-dark" />
        <div className="space-y-2">
          <div className="h-3 w-20 rounded bg-kinetic-dark" />
          <div className="h-4 w-32 rounded bg-kinetic-dark" />
        </div>
      </div>
      <div className="h-[88px] rounded-lg bg-kinetic-dark" />
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-kinetic-dark" />
        <div className="h-3 w-4/5 rounded bg-kinetic-dark" />
      </div>
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────
// Tela 4 do redesign 2a — a mais importante das 16 (é a de conversão). Uma
// placa só: enquanto não envia, carrega a oferta; depois de enviar, ela
// mesma vira a confirmação (regra 5 — uma placa, um job).

export default function PublicApplyPage() {
  const t = useT();
  const schema = useMemo(() => criarSchema(t), [t]);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [submitState, setSubmitState] = useState<SubmitState>({ kind: 'idle' });

  const {
    data: campaign,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['campaign', 'public', id],
    queryFn: () => api.get<Campaign>(`/campaigns/${id}`).then((r) => r.data),
    enabled: !!id,
    retry: 1,
  });

  const {
    register,
    handleSubmit,
    watch,
    getValues,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const handleCheck = useInstagramHandleCheck();
  const igHandleField = register('igHandle');

  // Editar o @ depois de um bloqueio ("não existe") limpa a mensagem na
  // hora — o desfecho antigo era de outro valor, não faz sentido continuar
  // mostrando. O próximo submit verifica o novo valor do zero.
  function handleIgHandleChange(e: React.ChangeEvent<HTMLInputElement>) {
    igHandleField.onChange(e);
    if (errors.igHandle?.type === 'manual') clearErrors('igHandle');
  }

  // Verifica ao sair do campo — nunca enquanto digita (prefixo de handle
  // costuma ser o @ de outra pessoa, verificar a cada tecla dava falso
  // positivo e queimava cota à toa). Formato inválido nem chega a verificar:
  // a mensagem de "handle inválido" do zod já cobre isso no submit.
  async function handleIgHandleBlur(e: React.FocusEvent<HTMLInputElement>) {
    igHandleField.onBlur(e);
    const normalized = normalizeHandle(getValues('igHandle') ?? '');
    if (!INSTAGRAM_HANDLE_FORMAT.test(normalized)) return;
    if (handleCheck.checkedHandle === normalized) return; // já verificado
    await handleCheck.check(normalized);
  }

  const rawHandle = watch('igHandle') ?? '';
  const normalizedHandle = normalizeHandle(rawHandle);
  const handleAlreadyChecked = handleCheck.checkedHandle === normalizedHandle;
  const handleHint = errors.igHandle
    ? undefined
    : handleCheck.checking
      ? t.app.acoes.verificando
      : handleAlreadyChecked && handleCheck.result === 'FOUND'
        ? t.app.handleCheck.encontrado
        : handleAlreadyChecked && handleCheck.result === 'UNKNOWN'
          ? t.app.handleCheck.incerto
          : undefined;
  const handleHintTone =
    handleAlreadyChecked && handleCheck.result === 'FOUND' ? 'success' : 'muted';

  async function onSubmit(values: FormValues) {
    setSubmitState({ kind: 'idle' });

    // Reaproveita o desfecho do blur quando já existe; senão verifica agora,
    // antes de enviar. O mesmo @ nunca é verificado 2x (dedupe é do hook).
    const outcome = await handleCheck.check(values.igHandle);
    if (outcome === 'NOT_FOUND') {
      setError('igHandle', {
        type: 'manual',
        message: t.app.handleCheck.naoEncontrado,
      });
      return;
    }

    try {
      await api.post(`/programs/${id}/apply/public`, {
        igHandle: values.igHandle,
        email: values.email,
        name: values.name,
        phone: values.phone,
        message: values.message || undefined,
        // O front manda só que as caixas foram marcadas. Quais VERSÕES dos
        // documentos valem é decisão do servidor.
        acceptedTermsAndPrivacy: values.acceptedTermsAndPrivacy,
        declaredAdult: values.declaredAdult,
      });
      setSubmitState({ kind: 'success', brandName: campaign?.brand?.name ?? t.app.publico.candidatura.aMarca });
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
              : t.app.publico.candidatura.jaSeCandidatou,
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
          className="flex items-center gap-[7px] text-[13px] text-kinetic-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft size={14} />
          {t.app.acoes.voltar}
        </button>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-10">
        {isLoading && <PageSkeleton />}

        {isError && (
          <div className="py-16 text-center">
            <p className="font-display font-semibold text-foreground">{t.app.publico.candidatura.naoEncontrada}</p>
            <p className="mt-1 text-sm text-kinetic-muted">
              {t.app.publico.candidatura.naoEncontradaDescricao}
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
                  <span className="font-mono text-[13px] text-kinetic-muted">{initials}</span>
                )}
              </div>
              <div>
                <p className="text-xs text-kinetic-muted">{t.app.publico.candidatura.campanhaDe}</p>
                <p className="mt-[3px] font-display text-[15px] font-semibold tracking-[-.025em] text-foreground">
                  {campaign.brand?.name ?? '—'}
                </p>
              </div>
            </div>

            <h1 className="mb-[26px] font-display text-[36px] font-bold leading-[.95] tracking-[-.05em] sm:text-[46px] leading-none text-foreground">
              {campaign.title}
            </h1>

            {/* Placa — oferta, ou (depois de enviar) confirmação */}
            <KineticPlate marks="all">
              {isSuccess ? (
                <>
                  <p className="font-display text-[34px] font-bold leading-[1.05] tracking-[-.05em] text-black">
                    {t.app.publico.candidatura.enviada}
                  </p>
                  <div className="mt-5 flex flex-col gap-2 text-[13px] leading-[1.5] text-[#6a6a64]">
                    <p>
                      <span className="font-medium text-[#3a3a34]">{submitState.brandName}</span>{' '}
                      vai analisar seu perfil do Instagram.
                    </p>
                    <p>{t.app.publico.candidatura.decisaoPorEmail}</p>
                    <p>{t.app.publico.candidatura.seAprovada}</p>
                  </div>
                </>
              ) : (
                <>
                  <p className="mb-3 font-mono text-[9px] uppercase tracking-[.16em] text-[#6a6a64]">
                    {t.app.publico.candidatura.oQueRecebe}
                  </p>
                  <p className="font-display text-[26px] font-bold leading-[1.04] tracking-[-.045em] text-black">
                    {formatOffer(campaign)}
                  </p>
                  <p className="mt-2.5 text-xs text-[#6a6a64]">
                    {campaign.offerType === 'PRODUCT'
                      ? t.app.publico.candidatura.produtoEnviado
                      : t.app.creator.detalheCampanha.porCandidaturaAprovada}
                  </p>

                  {campaign.offerDeadlineDays != null && (
                    <>
                      <div className="mb-5 mt-[22px] h-px bg-[#c9c9c3]" />
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <CountUp>
                            <span className="font-display text-[40px] font-bold leading-[.85] tracking-[-.05em] text-black tabular-nums">
                              {campaign.offerDeadlineDays}
                            </span>
                          </CountUp>
                          <p className="mt-3 text-xs text-[#7a7a74]">
                            {campaign.offerType === 'PRODUCT'
                              ? t.app.publico.candidatura.diasAteEnvio
                              : t.app.publico.candidatura.diasAtePagamento}
                          </p>
                        </div>
                        <div>
                          <CountUp delay={140}>
                            <span className="font-display text-[40px] font-bold leading-[.85] tracking-[-.05em] text-black tabular-nums">
                              {campaign.maxSpots}
                            </span>
                          </CountUp>
                          <p className="mt-3 text-xs text-[#7a7a74]">vagas abertas</p>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </KineticPlate>

            {!isSuccess && (
              <>
                {campaign.deadline && (
                  <p className="mt-[22px] flex items-center gap-2 text-xs text-kinetic-muted">
                    <CalendarDays size={13} />
                    Inscrições até {formatDateLong(campaign.deadline)}
                  </p>
                )}

                {campaign.niches.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-[7px]">
                    {campaign.niches.map((n) => (
                      <span
                        key={n}
                        className="rounded-[3px] border border-kinetic-gray px-[9px] py-[5px] text-[11px] capitalize text-kinetic-muted"
                      >
                        {n}
                      </span>
                    ))}
                  </div>
                )}

                <p className="mt-[18px] whitespace-pre-line break-words text-sm leading-[1.55] text-kinetic-muted">
                  {campaign.description}
                </p>

                <div className="my-[30px] h-px bg-muted" />

                {campaign.status !== 'ACTIVE' ? (
                  <p className="text-sm text-kinetic-muted">
                    {t.app.publico.candidatura.encerradas}
                  </p>
                ) : (
                  <form onSubmit={handleSubmit(onSubmit)} noValidate>
                    <h2 className="font-display text-base font-semibold tracking-[-.03em] text-foreground">
                      {t.app.publico.candidatura.participar}
                    </h2>
                    <p className="mb-[26px] mt-[6px] text-[13px] text-kinetic-muted">
                      {t.app.publico.candidatura.levaUmMinuto}
                    </p>

                    <div className="flex flex-col gap-6">
                      <KineticField
                        label={t.app.publico.candidatura.handle}
                        required
                        prefix="@"
                        autoComplete="off"
                        autoCapitalize="none"
                        autoCorrect="off"
                        error={errors.igHandle?.message}
                        hint={handleHint}
                        hintTone={handleHintTone}
                        {...igHandleField}
                        onBlur={handleIgHandleBlur}
                        onChange={handleIgHandleChange}
                      />
                      <KineticField
                        label={t.app.publico.candidatura.email}
                        required
                        type="email"
                        autoComplete="email"
                        error={errors.email?.message}
                        {...register('email')}
                      />
                      <KineticField
                        label={t.app.publico.candidatura.nome}
                        required
                        placeholder={t.app.publico.candidatura.nomePlaceholder}
                        autoComplete="name"
                        error={errors.name?.message}
                        {...register('name')}
                      />
                      <KineticField
                        label={t.app.publico.candidatura.telefone}
                        required
                        type="tel"
                        placeholder="(11) 91234-5678"
                        autoComplete="tel"
                        error={errors.phone?.message}
                        {...register('phone')}
                      />
                      <KineticTextarea
                        label={t.app.publico.candidatura.mensagem}
                        placeholder={t.app.publico.candidatura.mensagemPlaceholder}
                        error={errors.message?.message}
                        {...register('message')}
                      />
                    </div>

                    {submitState.kind === 'conflict' && (
                      <p className="mt-6 text-sm text-destructive">{submitState.message}</p>
                    )}
                    {submitState.kind === 'throttled' && (
                      <p className="mt-6 text-sm text-destructive">
                        {t.app.erros.muitasTentativas}
                      </p>
                    )}
                    {submitState.kind === 'error' && (
                      <p className="mt-6 text-sm text-destructive">
                        {t.app.publico.candidatura.algoDeuErrado}
                      </p>
                    )}

                    {/* O aviso de criação de conta vem ANTES do botão, não
                        num rodapé depois dele: a conta nasce no envio, e quem
                        preenche este formulário quase nunca sabe disso (era o
                        furo apontado na auditoria). */}
                    <LegalAcceptanceFields
                      className="mt-8"
                      termsField={register('acceptedTermsAndPrivacy')}
                      adultField={register('declaredAdult')}
                      termsError={errors.acceptedTermsAndPrivacy?.message}
                      adultError={errors.declaredAdult?.message}
                      intro={t.app.publico.candidatura.avisoDados}
                    />

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="mt-8 min-h-[56px] w-full bg-lime font-mono text-[12px] font-medium uppercase tracking-widest text-black transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSubmitting
                        ? handleCheck.checking
                          ? t.app.acoes.verificando
                          : t.app.publico.candidatura.enviando
                        : 'Quero participar'}
                    </button>
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
