import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import { api } from '../../services/api';
import { useAuthStore, type AuthUser } from '../../stores/auth.store';
import { useStepGuard } from '../../hooks/useStepGuard';
import { useInstagramHandleCheck } from '../../hooks/useInstagramHandleCheck';
import KineticPlate from '../../components/primitives/kinetic/KineticPlate';
import KineticField from '../../components/primitives/kinetic/KineticField';
import KineticActions from '../../components/primitives/kinetic/KineticActions';
import NicheSelector from '../../components/primitives/kinetic/NicheSelector';
import LegalAcceptanceFields from '../../components/legal/LegalAcceptanceFields';
import { cn } from '../../lib/utils';
import { INSTAGRAM_HANDLE_FORMAT, PHONE_FORMAT, phoneFormatMessage } from '../../utils/format';
import { useT, type Dictionary } from '../../i18n';

// Schema é FUNÇÃO do dicionário, não const de módulo: mensagem de validação
// fixa no módulo congelaria no idioma do boot e não acompanharia a troca.
// O componente memoiza por idioma.
const criarSchema = (t: Dictionary) =>
  z.object({
  name: z.string().min(1, t.app.validacao.nomeObrigatorio).max(100, t.app.validacao.max100),
  email: z.string().email(t.app.validacao.emailInvalido).max(254, t.app.validacao.emailLongo),
  password: z.string().min(8, t.app.validacao.senhaMin).max(72, t.app.validacao.max72),
  // Obrigatório, como na candidatura pública: sem telefone a marca fica só com
  // o @ do Instagram, que não é canal de resposta garantido. Este cadastro era
  // a última porta de entrada de creator que não pedia.
  phone: z
    .string()
    .trim()
    .min(1, t.app.validacao.telefoneObrigatorio)
    .max(20, t.app.validacao.telefoneLongo)
    .regex(PHONE_FORMAT, phoneFormatMessage()),
  // Obrigatório desde 2026-09-02. O @ é a chave de tudo que a creator ganha
  // aqui — media kit vivo, seguidores, engajamento, posts, perfil público em
  // /c/:handle. Sem ele a conta nascia sem nada disso, e a marca via "Dados
  // do Instagram indisponíveis" pra sempre.
  // Normaliza antes de validar (mesmo pipe do /apply/:id): colar "@AnaFit" é
  // o caso comum, e barrar isso como "handle inválido" seria hostil — o campo
  // já mostra o "@" como prefixo. É a mesma normalização que a API aplica.
  instagramHandle: z
    .string()
    .min(1, t.app.validacao.handleObrigatorio)
    .transform((v) => v.replace(/^@+/, '').toLowerCase().trim())
    .pipe(
      z
        .string()
        .min(1, t.app.validacao.handleObrigatorio)
        .max(30, t.app.validacao.max30)
        .regex(INSTAGRAM_HANDLE_FORMAT, t.app.validacao.handleInvalido),
    ),
  niches: z.array(z.string()),
  // `literal(true)` e não `boolean()`: é o que torna impossível concluir o
  // cadastro sem marcar. A API repete a exigência (`@Equals(true)`), então
  // nem chamada direta cria conta sem aceite.
  acceptedTermsAndPrivacy: z.literal(true, {
    errorMap: () => ({ message: t.app.validacao.aceiteObrigatorio }),
  }),
  declaredAdult: z.literal(true, {
    errorMap: () => ({ message: t.app.validacao.maioridadeObrigatoria }),
  }),
  });

type FormValues = z.infer<ReturnType<typeof criarSchema>>;

interface RegisterResponse {
  accessToken: string;
  user: AuthUser;
}

function cleanHandle(raw?: string): string | undefined {
  if (!raw) return undefined;
  const cleaned = raw.replace(/^@+/, '').toLowerCase().trim();
  return cleaned || undefined;
}

// ─── Passos ─────────────────────────────────────────────────────────────────
// Formulário virou carrossel de 3 passos (pedido do Pedro: a placa única com
// 5 campos empilhados ficava densa demais no mobile). Navegação por botão
// (Continuar/Voltar via PlateActionBar), não por swipe — arrastar horizontal
// briga com o teclado/cursor de texto num input. Pager de bolinhas só como
// indicador visual (mesma linguagem da Fila de candidaturas), não clicável,
// pra não deixar avançar sem validar o passo atual.

/** Só a quantidade e a ordem: o rótulo de cada passo vem do dicionário. */
const STEPS = ['identidade', 'acesso', 'nichos'] as const;
const STEP_FIELDS: (keyof FormValues)[][] = [
  ['name', 'phone', 'instagramHandle'],
  ['email', 'password'],
  // As caixas de aceite ficam no último passo, junto do "Criar conta": é
  // preciso aceitar imediatamente antes de criar, não três passos antes.
  [],
];
const FIELD_STEP: Partial<Record<keyof FormValues, number>> = {
  name: 0,
  phone: 0,
  instagramHandle: 0,
  email: 1,
  password: 1,
};

// ─── Página ──────────────────────────────────────────────────────────────────
// Tela 10 do redesign 2a. Placa-formulário — mesmo padrão do Login. O
// NicheSelector ganha a variante "plate" aqui.

export default function RegisterInfluencerPage() {
  const t = useT();
  const schema = useMemo(() => criarSchema(t), [t]);
  const { accessToken, user, setAuth } = useAuthStore();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(0);
  const isStepGuarded = useStepGuard(step);

  const {
    register,
    control,
    handleSubmit,
    trigger,
    setError,
    clearErrors,
    getValues,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { niches: [] },
  });

  const handleCheck = useInstagramHandleCheck();
  const instagramHandleField = register('instagramHandle');

  if (accessToken && user) {
    return <Navigate to="/influencer" replace />;
  }

  // Verifica ao sair do campo — nunca enquanto digita. Campo ainda vazio (a
  // pessoa saiu antes de digitar) não verifica nada: quem cobra o campo é o
  // schema, no "Continuar". Mesmo desfecho é reaproveitado se "Continuar" for
  // clicado sem passar pelo blur (o dedupe é do hook).
  async function handleInstagramHandleBlur(e: React.FocusEvent<HTMLInputElement>) {
    instagramHandleField.onBlur(e);
    const handle = cleanHandle(getValues('instagramHandle'));
    if (!handle || !INSTAGRAM_HANDLE_FORMAT.test(handle)) return;
    if (handleCheck.checkedHandle === handle) return;
    await handleCheck.check(handle);
  }

  function handleInstagramHandleChange(e: React.ChangeEvent<HTMLInputElement>) {
    instagramHandleField.onChange(e);
    if (errors.instagramHandle?.type === 'manual') clearErrors('instagramHandle');
  }

  async function next() {
    const valid = await trigger(STEP_FIELDS[step]);
    if (!valid) return;

    // O bloqueio de handle inexistente acontece aqui, saindo do passo de
    // Identidade — é onde o campo está na tela, e o handle é imutável depois
    // do cadastro (um @ errado aqui é permanente, diferente da candidatura).
    if (step === 0) {
      // O handle já passou pelo `trigger` acima (obrigatório + formato), então
      // aqui ele existe — só falta saber se a conta existe no Instagram.
      const handle = cleanHandle(getValues('instagramHandle'));
      if (handle) {
        const outcome = await handleCheck.check(handle);
        if (outcome === 'NOT_FOUND') {
          setError('instagramHandle', {
            type: 'manual',
            message: t.app.handleCheck.naoEncontrado,
          });
          return;
        }
      }
    }

    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  const rawInstagramHandle = watch('instagramHandle') ?? '';
  const normalizedInstagramHandle = cleanHandle(rawInstagramHandle);
  const instagramHandleAlreadyChecked =
    !!normalizedInstagramHandle && handleCheck.checkedHandle === normalizedInstagramHandle;
  const instagramHandleHint = errors.instagramHandle
    ? undefined
    : handleCheck.checking
      ? t.app.acoes.verificando
      : instagramHandleAlreadyChecked && handleCheck.result === 'FOUND'
        ? t.app.handleCheck.encontrado
        : instagramHandleAlreadyChecked && handleCheck.result === 'UNKNOWN'
          ? t.app.handleCheck.incerto
          : undefined;
  const instagramHandleHintTone =
    instagramHandleAlreadyChecked && handleCheck.result === 'FOUND' ? 'success' : 'muted';

  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  const onSubmit = async (values: FormValues) => {
    const payload = {
      name: values.name,
      email: values.email,
      password: values.password,
      phone: values.phone,
      instagramHandle: cleanHandle(values.instagramHandle),
      ...(values.niches.length ? { niches: values.niches } : {}),
      // O front manda só que as caixas foram marcadas. Quais VERSÕES dos
      // documentos valem é decisão do servidor.
      acceptedTermsAndPrivacy: values.acceptedTermsAndPrivacy,
      declaredAdult: values.declaredAdult,
    };

    try {
      const { data } = await api.post<RegisterResponse>('/auth/register/influencer', payload);
      setAuth(data.accessToken, data.user);
      navigate('/influencer', { replace: true });
    } catch (err) {
      if (!axios.isAxiosError(err)) {
        setError('root', { message: t.app.erros.inesperado });
        return;
      }

      // Sem response = a request não chegou ao servidor (rede caiu, API fora,
      // proxy 502). Só AQUI faz sentido falar em "conexão".
      if (!err.response) {
        setError('root', {
          message: t.app.erros.semConexao,
        });
        return;
      }

      const { status, data: body } = err.response as {
        status: number;
        data?: { message?: string | string[]; field?: string };
      };
      const serverMessage = Array.isArray(body?.message) ? body?.message[0] : body?.message;

      if (status === 429) {
        setError('root', { message: t.app.erros.muitasTentativas });
        return;
      }

      const FIELD_KEYS: Array<keyof FormValues> = [
        'name',
        'phone',
        'email',
        'password',
        'instagramHandle',
      ];
      if (body?.field && (FIELD_KEYS as string[]).includes(body.field)) {
        const field = body.field as keyof FormValues;
        setError(field, { message: serverMessage ?? t.app.validacao.valorInvalido });
        // O erro pode ser de um campo que ficou pra trás num passo anterior —
        // sem isso a mensagem existe no form mas fica invisível pro usuário.
        setStep(FIELD_STEP[field] ?? STEPS.length - 1);
        return;
      }

      setError('root', {
        message: serverMessage ?? t.app.erros.naoFoiPossivelCriarConta,
      });
    }
  };

  return (
    <div>
      <span className="mb-[22px] block font-display text-[26px] font-bold tracking-[-.05em] text-foreground">
        tay<span className="text-lime">ro</span>
      </span>

      <h1 className="font-display text-[36px] font-bold leading-[.95] tracking-[-.05em] sm:text-[46px] text-foreground">
        {t.app.cadastroCreator.titulo}
      </h1>
      <p className="mb-7 mt-2 text-[13px] text-kinetic-muted">
        {t.app.cadastroCreator.subtitulo}
      </p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <KineticPlate marks="top" flush>
          <div className="flex flex-col gap-6 px-6 pb-[26px] pt-[30px]">
            {step === 0 && (
              <>
                <KineticField
                  label={t.app.cadastroCreator.nome}
                  variant="plate"
                  autoComplete="name"
                  placeholder={t.app.cadastroCreator.nomePlaceholder}
                  error={errors.name?.message}
                  {...register('name')}
                />
                <KineticField
                  label={t.app.cadastroCreator.telefone}
                  variant="plate"
                  type="tel"
                  autoComplete="tel"
                  placeholder={t.app.cadastroCreator.telefonePlaceholder}
                  error={errors.phone?.message}
                  {...register('phone')}
                />
                <KineticField
                  label={t.app.cadastroCreator.handle}
                  variant="plate"
                  prefix="@"
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  error={errors.instagramHandle?.message}
                  hint={instagramHandleHint}
                  hintTone={instagramHandleHintTone}
                  {...instagramHandleField}
                  onBlur={handleInstagramHandleBlur}
                  onChange={handleInstagramHandleChange}
                />
              </>
            )}

            {step === 1 && (
              <>
                <KineticField
                  label={t.app.cadastroCreator.email}
                  variant="plate"
                  type="email"
                  autoComplete="email"
                  placeholder={t.app.cadastroCreator.emailPlaceholder}
                  error={errors.email?.message}
                  {...register('email')}
                />
                <KineticField
                  label={t.app.cadastroCreator.senha}
                  variant="plate"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  hint={t.app.cadastroCreator.senhaHint}
                  error={errors.password?.message}
                  suffix={
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((v) => !v)}
                      className="shrink-0 text-[#8A8A84] transition-colors hover:text-black"
                      aria-label={showPassword ? t.app.acoes.ocultarSenha : t.app.acoes.mostrarSenha}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  }
                  {...register('password')}
                />
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <p className="mb-3 text-[11px] text-[#6a6a64]">{t.app.cadastroCreator.seusNichos}</p>
                  <Controller
                    name="niches"
                    control={control}
                    render={({ field }) => (
                      <NicheSelector
                        value={field.value}
                        onChange={field.onChange}
                        variant="plate"
                      />
                    )}
                  />
                </div>
                <LegalAcceptanceFields
                  variant="plate"
                  termsField={register('acceptedTermsAndPrivacy')}
                  adultField={register('declaredAdult')}
                  termsError={errors.acceptedTermsAndPrivacy?.message}
                  adultError={errors.declaredAdult?.message}
                />
              </>
            )}

            {errors.root && <p className="text-[13px] text-destructive">{errors.root.message}</p>}
          </div>

          <KineticActions
            actions={[
              ...(step > 0 ? [{ label: t.app.acoes.voltar, onClick: back, width: 130 }] : []),
              step < STEPS.length - 1
                ? {
                    label:
                      step === 0 && handleCheck.checking
                        ? t.app.acoes.verificando
                        : t.app.acoes.continuar,
                    type: 'button' as const,
                    onClick: next,
                    disabled: isStepGuarded || (step === 0 && handleCheck.checking),
                    primary: true,
                  }
                : {
                    label: isSubmitting
                      ? t.app.cadastroCreator.criandoConta
                      : t.app.cadastroCreator.criarConta,
                    type: 'submit' as const,
                    disabled: isSubmitting || isStepGuarded,
                    primary: true,
                  },
            ]}
          />
        </KineticPlate>

        <div className="mt-[18px] flex items-center justify-center gap-[7px]">
          {STEPS.map((passo, i) => (
            <span
              key={passo}
              aria-hidden
              className={cn(
                'h-0.5 w-[22px] rounded-full transition-colors',
                i === step ? 'bg-lime' : 'bg-[#242422]',
              )}
            />
          ))}
        </div>
      </form>

      <p className="mt-[26px] text-[13px] text-kinetic-muted">
        {t.app.cadastroCreator.jaTemConta}{' '}
        <Link to="/login" className="font-medium text-lime hover:underline">
          {t.app.acoes.entrar}
        </Link>
      </p>
    </div>
  );
}
