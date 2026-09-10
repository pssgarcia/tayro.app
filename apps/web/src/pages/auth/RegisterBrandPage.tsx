import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import { api } from '../../services/api';
import { useT, type Dictionary } from '../../i18n';
import { useAuthStore, type AuthUser } from '../../stores/auth.store';
import { useStepGuard } from '../../hooks/useStepGuard';
import KineticPlate from '../../components/primitives/kinetic/KineticPlate';
import KineticField from '../../components/primitives/kinetic/KineticField';
import KineticActions from '../../components/primitives/kinetic/KineticActions';
import NicheSelector from '../../components/primitives/kinetic/NicheSelector';
import LegalAcceptanceFields from '../../components/legal/LegalAcceptanceFields';
import { cn } from '../../lib/utils';

// ─── Schema ───────────────────────────────────────────────────────────────────

// Schema é função do dicionário: mensagem fixa no módulo congelaria no
// idioma do boot (ver `i18n/README.md`).
const criarSchema = (t: Dictionary) =>
  z.object({
    brandName: z
      .string()
      .min(1, t.app.cadastroMarca.nomeObrigatorio)
      .max(100, t.app.validacao.max100),
    email: z.string().email(t.app.validacao.emailInvalido).max(254, t.app.validacao.emailLongo),
    password: z.string().min(8, t.app.validacao.senhaMin).max(72, t.app.validacao.max72),
    niches: z.array(z.string()),
    website: z
      .string()
      .url(t.app.cadastroMarca.urlInvalida)
      .max(2048)
      .optional()
      .or(z.literal('')),
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

// ─── Passos ─────────────────────────────────────────────────────────────────
// Mesmo padrão de carrossel de 3 passos do cadastro de creator: placa única
// com 5 campos ficava densa demais no mobile. Voltar/Continuar via
// PlateActionBar, pager de bolinhas só como indicador (não clicável).

/** Só a quantidade e a ordem: o rótulo vem do dicionário. */
const STEPS = ['identidade', 'acesso', 'nichos'] as const;
// As caixas de aceite ficam no último passo, junto do "Criar conta": é
// preciso aceitar imediatamente antes de criar, não dois passos antes.
const STEP_FIELDS: (keyof FormValues)[][] = [['brandName', 'website'], ['email', 'password'], []];
const FIELD_STEP: Partial<Record<keyof FormValues, number>> = {
  brandName: 0,
  website: 0,
  email: 1,
  password: 1,
};

// ─── Página ──────────────────────────────────────────────────────────────────
// Tela 11 do redesign 2a. Igual à 10 (placa-formulário) — o campo de nichos
// separado por vírgula sai, usa o mesmo NicheSelector(variant="plate") da
// creator (era a única tela do app que pedia nicho como texto livre).

export default function RegisterBrandPage() {
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
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { niches: [] } });

  if (accessToken && user) {
    return <Navigate to="/brand" replace />;
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
      brandName: values.brandName,
      email: values.email,
      password: values.password,
      ...(values.niches.length ? { niches: values.niches } : {}),
      ...(values.website ? { website: values.website } : {}),
      // O front manda só que as caixas foram marcadas. Quais VERSÕES dos
      // documentos valem é decisão do servidor.
      acceptedTermsAndPrivacy: values.acceptedTermsAndPrivacy,
      declaredAdult: values.declaredAdult,
    };

    try {
      const { data } = await api.post<RegisterResponse>('/auth/register/brand', payload);
      setAuth(data.accessToken, data.user);
      navigate('/brand', { replace: true });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 409) {
          setError('email', { message: t.app.cadastroMarca.emailEmUso });
          setStep(FIELD_STEP.email ?? STEPS.length - 1);
        } else if (status === 429) {
          setError('root', {
            message: t.app.erros.muitasTentativas,
          });
        } else if (status === 400) {
          setError('root', { message: t.app.cadastroMarca.verifiqueDados });
        } else {
          setError('root', { message: t.app.cadastroMarca.erroConexao });
        }
      } else {
        setError('root', { message: t.app.erros.inesperado });
      }
    }
  };

  return (
    <div>
      <span className="mb-[22px] block font-display text-[26px] font-bold tracking-[-.05em] text-foreground">
        tay<span className="text-lime">ro</span>
      </span>

      <h1 className="font-display text-[36px] font-bold leading-[.95] tracking-[-.05em] sm:text-[46px] leading-[1.02] text-foreground">
        {t.app.cadastroMarca.titulo}
        <br />
        {t.app.cadastroMarca.tituloDestaque}
      </h1>
      <p className="mb-7 mt-2 text-[13px] text-kinetic-muted">
        {t.app.cadastroMarca.subtitulo}
      </p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <KineticPlate marks="top" flush>
          <div className="flex flex-col gap-6 px-6 pb-[26px] pt-[30px]">
            {step === 0 && (
              <>
                <KineticField
                  label={t.app.cadastroMarca.nome}
                  variant="plate"
                  autoComplete="organization"
                  placeholder={t.app.cadastroMarca.nomePlaceholder}
                  error={errors.brandName?.message}
                  {...register('brandName')}
                />
                <KineticField
                  label={t.app.cadastroMarca.website}
                  variant="plate"
                  type="url"
                  autoComplete="url"
                  placeholder={t.app.cadastroMarca.websitePlaceholder}
                  error={errors.website?.message}
                  {...register('website')}
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
                  placeholder={t.app.cadastroMarca.emailPlaceholder}
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
                  <p className="mb-3 text-[11px] text-[#6a6a64]">{t.app.cadastroMarca.nichosDaMarca}</p>
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
                    label: t.app.acoes.continuar,
                    type: 'button' as const,
                    onClick: next,
                    disabled: isStepGuarded,
                    primary: true,
                  }
                : {
                    label: isSubmitting
                      ? t.app.cadastroCreator.criandoConta
                      : t.app.cadastroMarca.titulo,
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
        Quer se candidatar em vez disso?{' '}
        <Link to="/register/influencer" className="font-medium text-lime hover:underline">
          {t.app.cadastroMarca.souCreator}
        </Link>
      </p>
    </div>
  );
}
