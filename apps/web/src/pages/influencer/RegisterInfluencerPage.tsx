import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import axios from 'axios';
import { api } from '../../services/api';
import { useAuthStore, type AuthUser } from '../../stores/auth.store';
import Plate from '../../components/primitives/Plate';
import PlateField from '../../components/primitives/PlateField';
import PlateActionBar from '../../components/primitives/PlateActionBar';
import NicheSelector from '../../components/primitives/NicheSelector';
import { cn } from '../../lib/utils';

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

  const {
    register,
    control,
    handleSubmit,
    trigger,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { niches: [] },
  });

  if (accessToken && user) {
    return <Navigate to="/influencer" replace />;
  }

  async function next() {
    const valid = await trigger(STEP_FIELDS[step]);
    if (valid) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  const onSubmit = async (values: FormValues) => {
    const payload = {
      name: values.name,
      email: values.email,
      password: values.password,
      ...(cleanHandle(values.instagramHandle) ? { instagramHandle: cleanHandle(values.instagramHandle) } : {}),
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

      setError('root', { message: serverMessage ?? 'Não foi possível criar a conta. Tente novamente.' });
    }
  };

  return (
    <div>
      <span className="mb-[22px] block font-display text-[26px] font-bold tracking-[-.05em] text-foreground">
        tay<span className="text-lime">ro</span>
      </span>

      <h1 className="font-display text-d-md text-foreground">Criar sua conta</h1>
      <p className="mb-7 mt-2 text-[13px] text-[#75756E]">
        Leva 1 minuto. Depois você já vê os programas abertos.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Plate marks="top" flush>
          <div className="flex flex-col gap-6 px-6 pb-[26px] pt-[30px]">
            {step === 0 && (
              <>
                <PlateField
                  label="Nome"
                  variant="plate"
                  autoComplete="name"
                  placeholder="Ana Silva"
                  error={errors.name?.message}
                  {...register('name')}
                />
                <PlateField
                  label="@ do Instagram"
                  variant="plate"
                  prefix="@"
                  placeholder="seuhandle"
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  error={errors.instagramHandle?.message}
                  {...register('instagramHandle')}
                />
              </>
            )}

            {step === 1 && (
              <>
                <PlateField
                  label="E-mail"
                  variant="plate"
                  type="email"
                  autoComplete="email"
                  placeholder="voce@email.com"
                  error={errors.email?.message}
                  {...register('email')}
                />
                <PlateField
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
                      className="shrink-0 text-[#8A8A84] transition-colors hover:text-plate-ink"
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
                <p className="mb-3 text-[11px] text-plate-muted">Seus nichos</p>
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

          <PlateActionBar
            secondary={step > 0 ? { label: 'Voltar', onClick: back } : undefined}
            primary={
              step < STEPS.length - 1
                ? { label: 'Continuar', type: 'button', onClick: next, icon: <ArrowRight size={16} /> }
                : {
                    label: isSubmitting ? 'Criando conta…' : 'Criar conta',
                    type: 'submit',
                    disabled: isSubmitting,
                    icon: <ArrowRight size={16} />,
                  }
            }
          />
        </Plate>

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

      <p className="mt-[26px] text-[13px] text-[#75756E]">
        Já tem conta?{' '}
        <Link to="/login" className="font-medium text-lime hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
