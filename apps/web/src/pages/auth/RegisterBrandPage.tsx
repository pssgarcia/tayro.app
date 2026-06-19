import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import { api } from '../../services/api';
import { useAuthStore, type AuthUser } from '../../stores/auth.store';
import { cn } from '../../lib/utils';

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  brandName: z
    .string()
    .min(1, 'Nome da marca obrigatório')
    .max(100, 'Máximo 100 caracteres'),
  email: z.string().email('E-mail inválido').max(254, 'E-mail muito longo'),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .max(72, 'Máximo 72 caracteres'),
  niches: z.string().max(1000).optional(),
  website: z
    .string()
    .url('URL inválida (inclua https://)')
    .max(2048)
    .optional()
    .or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

interface RegisterResponse {
  accessToken: string;
  user: AuthUser;
}

// Converte o campo livre de nichos (separado por vírgula) no array que a API espera
function parseNiches(raw?: string): string[] {
  if (!raw) return [];
  return [
    ...new Set(
      raw
        .split(',')
        .map((n) => n.trim().toLowerCase())
        .filter(Boolean),
    ),
  ].slice(0, 20);
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function RegisterBrandPage() {
  const { accessToken, user, setAuth } = useAuthStore();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // Já autenticado — redireciona (depois de todos os hooks)
  if (accessToken && user) {
    return <Navigate to="/brand" replace />;
  }

  const onSubmit = async (values: FormValues) => {
    const payload = {
      brandName: values.brandName,
      email: values.email,
      password: values.password,
      ...(parseNiches(values.niches).length
        ? { niches: parseNiches(values.niches) }
        : {}),
      ...(values.website ? { website: values.website } : {}),
    };

    try {
      const { data } = await api.post<RegisterResponse>(
        '/auth/register/brand',
        payload,
      );
      setAuth(data.accessToken, data.user);
      navigate('/brand', { replace: true });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 409) {
          setError('email', { message: 'Já existe uma conta com esse e-mail' });
        } else if (status === 429) {
          setError('root', {
            message: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
          });
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

  const inputCls = (hasError: boolean) =>
    cn(
      'w-full rounded-lg border bg-secondary px-4 py-2.5 text-sm text-foreground',
      'placeholder:text-muted-foreground focus:outline-none focus:ring-1',
      hasError
        ? 'border-destructive focus:border-destructive focus:ring-destructive/30'
        : 'border-input focus:border-lime/50 focus:ring-lime/20',
    );

  return (
    <div className="flex flex-col gap-8">
      {/* Logo */}
      <div className="flex justify-center">
        <span className="font-display text-3xl font-bold tracking-tight">
          tay<span className="text-lime">ro</span>
        </span>
      </div>

      {/* Headline */}
      <div className="space-y-1 text-center">
        <h1 className="font-display text-[32px] font-bold leading-tight text-foreground">
          Crie sua conta de marca!
        </h1>
        <p className="text-sm text-muted-foreground">
          Comece a receber candidaturas de creators fitness
        </p>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {errors.root && (
          <div className="rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-3">
            <p className="text-sm text-destructive">{errors.root.message}</p>
          </div>
        )}

        {/* Nome da marca */}
        <div className="space-y-1.5">
          <label htmlFor="brandName" className="text-sm font-medium text-foreground">
            Nome da marca
          </label>
          <input
            id="brandName"
            type="text"
            autoComplete="organization"
            placeholder="Minha Marca Fitness"
            className={inputCls(!!errors.brandName)}
            {...register('brandName')}
          />
          {errors.brandName && (
            <p className="text-xs text-destructive">{errors.brandName.message}</p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="voce@suamarca.com"
            className={inputCls(!!errors.email)}
            {...register('email')}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        {/* Senha */}
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Senha
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              className={cn(inputCls(!!errors.password), 'pr-10')}
              {...register('password')}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        {/* Nichos (opcional) */}
        <div className="space-y-1.5">
          <label htmlFor="niches" className="text-sm font-medium text-foreground">
            Nichos <span className="text-muted-foreground">(opcional)</span>
          </label>
          <input
            id="niches"
            type="text"
            placeholder="fitness, wellness, nutrição"
            className={inputCls(!!errors.niches)}
            {...register('niches')}
          />
          <p className="text-xs text-muted-foreground">Separe por vírgula.</p>
          {errors.niches && (
            <p className="text-xs text-destructive">{errors.niches.message}</p>
          )}
        </div>

        {/* Website (opcional) */}
        <div className="space-y-1.5">
          <label htmlFor="website" className="text-sm font-medium text-foreground">
            Website <span className="text-muted-foreground">(opcional)</span>
          </label>
          <input
            id="website"
            type="url"
            autoComplete="url"
            placeholder="https://suamarca.com"
            className={inputCls(!!errors.website)}
            {...register('website')}
          />
          {errors.website && (
            <p className="text-xs text-destructive">{errors.website.message}</p>
          )}
        </div>

        {/* Botão */}
        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            'w-full rounded-lg bg-lime py-2.5 text-sm font-semibold text-background',
            'transition-opacity hover:opacity-90',
            'disabled:cursor-not-allowed disabled:opacity-60',
          )}
        >
          {isSubmitting ? 'Criando conta…' : 'Criar conta'}
        </button>
      </form>

      {/* Link de login */}
      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{' '}
        <Link
          to="/login"
          className="font-medium text-foreground underline-offset-4 hover:text-lime hover:underline"
        >
          Entrar
        </Link>
      </p>
    </div>
  );
}
