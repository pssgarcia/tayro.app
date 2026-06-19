import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import { api } from '../../services/api';
import { useAuthStore, type AuthUser } from '../../stores/auth.store';
import NicheSelector from '../../components/primitives/NicheSelector';
import { cn } from '../../lib/utils';

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(100, 'Máximo 100 caracteres'),
  email: z.string().email('E-mail inválido').max(254, 'E-mail muito longo'),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .max(72, 'Máximo 72 caracteres'),
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

export default function RegisterInfluencerPage() {
  const { accessToken, user, setAuth } = useAuthStore();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { niches: [] },
  });

  if (accessToken && user) {
    return <Navigate to="/influencer" replace />;
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
      const { data } = await api.post<RegisterResponse>(
        '/auth/register/influencer',
        payload,
      );
      setAuth(data.accessToken, data.user);
      navigate('/influencer', { replace: true });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 409) {
          setError('email', { message: 'Já existe uma conta com esse e-mail' });
        } else if (status === 429) {
          setError('root', {
            message: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
          });
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
      <div className="flex justify-center">
        <span className="font-display text-3xl font-bold tracking-tight">
          tay<span className="text-lime">ro</span>
        </span>
      </div>

      <div className="space-y-1 text-center">
        <h1 className="font-display text-[32px] font-bold leading-tight text-foreground">
          Crie sua conta de creator.
        </h1>
        <p className="text-sm text-muted-foreground">
          Encontre programas de marcas fitness e feche parcerias.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {errors.root && (
          <div className="rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-3">
            <p className="text-sm text-destructive">{errors.root.message}</p>
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="name" className="text-sm font-medium text-foreground">
            Nome
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            placeholder="Ana Silva"
            className={inputCls(!!errors.name)}
            {...register('name')}
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="voce@email.com"
            className={inputCls(!!errors.email)}
            {...register('email')}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

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

        <div className="space-y-1.5">
          <label htmlFor="instagramHandle" className="text-sm font-medium text-foreground">
            Instagram <span className="text-muted-foreground">(opcional)</span>
          </label>
          <input
            id="instagramHandle"
            type="text"
            placeholder="@seuhandle"
            className={inputCls(!!errors.instagramHandle)}
            {...register('instagramHandle')}
          />
          {errors.instagramHandle && (
            <p className="text-xs text-destructive">
              {errors.instagramHandle.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Nichos <span className="text-muted-foreground">(opcional)</span>
          </label>
          <Controller
            name="niches"
            control={control}
            render={({ field }) => (
              <NicheSelector value={field.value} onChange={field.onChange} />
            )}
          />
        </div>

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
