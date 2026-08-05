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

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  brandName: z.string().min(1, 'Nome da marca obrigatório').max(100, 'Máximo 100 caracteres'),
  email: z.string().email('E-mail inválido').max(254, 'E-mail muito longo'),
  password: z.string().min(8, 'Mínimo 8 caracteres').max(72, 'Máximo 72 caracteres'),
  niches: z.array(z.string()),
  website: z.string().url('URL inválida (inclua https://)').max(2048).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

interface RegisterResponse {
  accessToken: string;
  user: AuthUser;
}

// ─── Página ──────────────────────────────────────────────────────────────────
// Tela 11 do redesign 2a. Igual à 10 (placa-formulário) — o campo de nichos
// separado por vírgula sai, usa o mesmo NicheSelector(variant="plate") da
// creator (era a única tela do app que pedia nicho como texto livre).

export default function RegisterBrandPage() {
  const { accessToken, user, setAuth } = useAuthStore();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { niches: [] } });

  if (accessToken && user) {
    return <Navigate to="/brand" replace />;
  }

  const onSubmit = async (values: FormValues) => {
    const payload = {
      brandName: values.brandName,
      email: values.email,
      password: values.password,
      ...(values.niches.length ? { niches: values.niches } : {}),
      ...(values.website ? { website: values.website } : {}),
    };

    try {
      const { data } = await api.post<RegisterResponse>('/auth/register/brand', payload);
      setAuth(data.accessToken, data.user);
      navigate('/brand', { replace: true });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 409) {
          setError('email', { message: 'Já existe uma conta com esse e-mail' });
        } else if (status === 429) {
          setError('root', { message: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.' });
        } else if (status === 400) {
          setError('root', { message: 'Verifique os dados e tente novamente.' });
        } else {
          setError('root', { message: 'Erro de conexão. Tente novamente.' });
        }
      } else {
        setError('root', { message: 'Erro inesperado. Tente novamente.' });
      }
    }
  };

  return (
    <div>
      <span className="mb-[22px] block font-display text-[26px] font-bold tracking-[-.05em] text-foreground">
        tay<span className="text-lime">ro</span>
      </span>

      <h1 className="font-display text-d-md leading-[1.02] text-foreground">
        Criar conta
        <br />
        da marca
      </h1>
      <p className="mb-7 mt-2 text-[13px] text-[#75756E]">
        Depois disso você já publica o primeiro programa.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Plate marks="top" flush>
          <div className="flex flex-col gap-6 px-6 pb-[26px] pt-[30px]">
            <PlateField
              label="Nome da marca"
              variant="plate"
              autoComplete="organization"
              placeholder="Minha Marca Fitness"
              error={errors.brandName?.message}
              {...register('brandName')}
            />
            <PlateField
              label="E-mail"
              variant="plate"
              type="email"
              autoComplete="email"
              placeholder="voce@suamarca.com"
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
            <PlateField
              label="Website (opcional)"
              variant="plate"
              type="url"
              autoComplete="url"
              placeholder="https://suamarca.com"
              error={errors.website?.message}
              {...register('website')}
            />
            <div>
              <p className="mb-3 text-[11px] text-plate-muted">Nichos da marca</p>
              <Controller
                name="niches"
                control={control}
                render={({ field }) => (
                  <NicheSelector value={field.value} onChange={field.onChange} variant="plate" />
                )}
              />
            </div>

            {errors.root && <p className="text-[13px] text-destructive">{errors.root.message}</p>}
          </div>

          <PlateActionBar
            primary={{
              label: isSubmitting ? 'Criando conta…' : 'Criar conta',
              type: 'submit',
              disabled: isSubmitting,
              icon: <ArrowRight size={16} />,
            }}
          />
        </Plate>
      </form>

      <p className="mt-[26px] text-[13px] text-[#75756E]">
        Quer se candidatar em vez disso?{' '}
        <Link to="/register/influencer" className="font-medium text-lime hover:underline">
          Sou creator
        </Link>
      </p>
    </div>
  );
}
