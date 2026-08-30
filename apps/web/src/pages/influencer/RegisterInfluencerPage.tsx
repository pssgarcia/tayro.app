import { useState } from 'react';
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
import { cn } from '../../lib/utils';
import { INSTAGRAM_HANDLE_FORMAT } from '../../utils/format';

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(100, 'Máximo 100 caracteres'),
  email: z.string().email('E-mail inválido').max(254, 'E-mail muito longo'),
  password: z.string().min(8, 'Mínimo 8 caracteres').max(72, 'Máximo 72 caracteres'),
  instagramHandle: z.string().max(30, 'Máximo 30 caracteres').optional(),
  niches: z.array(z.string()),
});

type FormValues = z.infer<typeof schema>;

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

const STEPS = ['Identidade', 'Acesso', 'Nichos'] as const;
const STEP_FIELDS: (keyof FormValues)[][] = [
  ['name', 'instagramHandle'],
  ['email', 'password'],
  [],
];
const FIELD_STEP: Partial<Record<keyof FormValues, number>> = {
  name: 0,
  instagramHandle: 0,
  email: 1,
  password: 1,
};

// ─── Página ──────────────────────────────────────────────────────────────────
// Tela 10 do redesign 2a. Placa-formulário — mesmo padrão do Login. O
// NicheSelector ganha a variante "plate" aqui.

export default function RegisterInfluencerPage() {
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

  // Verifica ao sair do campo — nunca enquanto digita. Campo vazio (handle é
  // opcional aqui) não verifica nada. Mesmo desfecho é reaproveitado se
  // "Continuar" for clicado sem passar pelo blur (o dedupe é do hook).
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
      const handle = cleanHandle(getValues('instagramHandle'));
      if (handle) {
        const outcome = await handleCheck.check(handle);
        if (outcome === 'NOT_FOUND') {
          setError('instagramHandle', {
            type: 'manual',
            message: 'Usuário não encontrado no Instagram — confira o @',
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
      ? 'Verificando…'
      : instagramHandleAlreadyChecked && handleCheck.result === 'FOUND'
        ? 'Perfil encontrado no Instagram'
        : instagramHandleAlreadyChecked && handleCheck.result === 'UNKNOWN'
          ? 'Não deu para confirmar agora — você pode continuar'
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
      ...(cleanHandle(values.instagramHandle)
        ? { instagramHandle: cleanHandle(values.instagramHandle) }
        : {}),
      ...(values.niches.length ? { niches: values.niches } : {}),
    };

    try {
      const { data } = await api.post<RegisterResponse>('/auth/register/influencer', payload);
      setAuth(data.accessToken, data.user);
      navigate('/influencer', { replace: true });
    } catch (err) {
      if (!axios.isAxiosError(err)) {
        setError('root', { message: 'Erro inesperado. Tente novamente.' });
        return;
      }

      // Sem response = a request não chegou ao servidor (rede caiu, API fora,
      // proxy 502). Só AQUI faz sentido falar em "conexão".
      if (!err.response) {
        setError('root', {
          message: 'Sem conexão com o servidor. Verifique sua internet e tente de novo.',
        });
        return;
      }

      const { status, data: body } = err.response as {
        status: number;
        data?: { message?: string | string[]; field?: string };
      };
      const serverMessage = Array.isArray(body?.message) ? body?.message[0] : body?.message;

      if (status === 429) {
        setError('root', { message: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.' });
        return;
      }

      const FIELD_KEYS: Array<keyof FormValues> = ['name', 'email', 'password', 'instagramHandle'];
      if (body?.field && (FIELD_KEYS as string[]).includes(body.field)) {
        const field = body.field as keyof FormValues;
        setError(field, { message: serverMessage ?? 'Valor inválido.' });
        // O erro pode ser de um campo que ficou pra trás num passo anterior —
        // sem isso a mensagem existe no form mas fica invisível pro usuário.
        setStep(FIELD_STEP[field] ?? STEPS.length - 1);
        return;
      }

      setError('root', {
        message: serverMessage ?? 'Não foi possível criar a conta. Tente novamente.',
      });
    }
  };

  return (
    <div>
      <span className="mb-[22px] block font-display text-[26px] font-bold tracking-[-.05em] text-foreground">
        tay<span className="text-lime">ro</span>
      </span>

      <h1 className="font-display text-[36px] font-bold leading-[.95] tracking-[-.05em] sm:text-[46px] text-foreground">
        Criar sua conta
      </h1>
      <p className="mb-7 mt-2 text-[13px] text-kinetic-muted">
        Leva 1 minuto. Depois você já vê as campanhas abertas.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <KineticPlate marks="top" flush>
          <div className="flex flex-col gap-6 px-6 pb-[26px] pt-[30px]">
            {step === 0 && (
              <>
                <KineticField
                  label="Nome"
                  variant="plate"
                  autoComplete="name"
                  placeholder="Ana Silva"
                  error={errors.name?.message}
                  {...register('name')}
                />
                <KineticField
                  label="@ do Instagram"
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
                  label="E-mail"
                  variant="plate"
                  type="email"
                  autoComplete="email"
                  placeholder="voce@email.com"
                  error={errors.email?.message}
                  {...register('email')}
                />
                <KineticField
                  label="Senha"
                  variant="plate"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  hint="Mínimo 8 caracteres"
                  error={errors.password?.message}
                  suffix={
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((v) => !v)}
                      className="shrink-0 text-[#8A8A84] transition-colors hover:text-black"
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  }
                  {...register('password')}
                />
              </>
            )}

            {step === 2 && (
              <div>
                <p className="mb-3 text-[11px] text-[#6a6a64]">Seus nichos</p>
                <Controller
                  name="niches"
                  control={control}
                  render={({ field }) => (
                    <NicheSelector value={field.value} onChange={field.onChange} variant="plate" />
                  )}
                />
              </div>
            )}

            {errors.root && <p className="text-[13px] text-destructive">{errors.root.message}</p>}
          </div>

          <KineticActions
            actions={[
              ...(step > 0 ? [{ label: 'Voltar', onClick: back, width: 130 }] : []),
              step < STEPS.length - 1
                ? {
                    label: step === 0 && handleCheck.checking ? 'Verificando…' : 'Continuar',
                    type: 'button' as const,
                    onClick: next,
                    disabled: isStepGuarded || (step === 0 && handleCheck.checking),
                    primary: true,
                  }
                : {
                    label: isSubmitting ? 'Criando conta…' : 'Criar conta',
                    type: 'submit' as const,
                    disabled: isSubmitting || isStepGuarded,
                    primary: true,
                  },
            ]}
          />
        </KineticPlate>

        <div className="mt-[18px] flex items-center justify-center gap-[7px]">
          {STEPS.map((label, i) => (
            <span
              key={label}
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
        Já tem conta?{' '}
        <Link to="/login" className="font-medium text-lime hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
