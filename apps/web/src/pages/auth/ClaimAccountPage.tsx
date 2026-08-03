import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import { api } from '../../services/api';
import { useAuthStore, type AuthUser } from '../../stores/auth.store';
import { cn } from '../../lib/utils';

const schema = z.object({
  password: z.string().min(8, 'Mínimo 8 caracteres').max(72, 'Máximo 72 caracteres'),
});

type FormValues = z.infer<typeof schema>;

interface ClaimResponse {
  accessToken: string;
  user: AuthUser;
}

export default function ClaimAccountPage() {
  const { accessToken, user, setAuth } = useAuthStore();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [rootError, setRootError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  if (accessToken && user) {
    return <Navigate to="/influencer" replace />;
  }

  const onSubmit = async (values: FormValues) => {
    setRootError(null);
    try {
      const { data } = await api.post<ClaimResponse>('/auth/claim', {
        token,
        password: values.password,
      });
      setAuth(data.accessToken, data.user);
      navigate('/influencer', { replace: true });
    } catch (err) {
      if (!axios.isAxiosError(err)) {
        setRootError('Erro inesperado. Tente novamente.');
        return;
      }
      if (!err.response) {
        setRootError('Sem conexão com o servidor. Verifique sua internet e tente de novo.');
        return;
      }
      if (err.response.status === 401) {
        setRootError(
          'Este link expirou ou já foi utilizado. Peça um novo aplicando-se novamente a um programa.',
        );
        return;
      }
      if (err.response.status === 429) {
        setRootError('Muitas tentativas. Aguarde alguns minutos e tente de novo.');
        return;
      }
      setRootError('Não foi possível definir sua senha. Tente novamente.');
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

  if (!token) {
    return (
      <div className="flex flex-col gap-6 text-center">
        <span className="font-display text-3xl font-bold tracking-tight">
          tay<span className="text-lime">ro</span>
        </span>
        <p className="text-sm text-destructive">
          Link inválido — falta o token de acesso. Confira o link do e-mail.
        </p>
        <Link to="/login" className="text-sm text-lime hover:underline">
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-center">
        <span className="font-display text-3xl font-bold tracking-tight">
          tay<span className="text-lime">ro</span>
        </span>
      </div>

      <div className="space-y-1 text-center">
        <h1 className="font-display text-[32px] font-bold leading-tight text-foreground">
          Defina sua senha.
        </h1>
        <p className="text-sm text-muted-foreground">
          Falta só isso para acessar sua conta e acompanhar suas candidaturas.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {rootError && (
          <div className="rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-3">
            <p className="text-sm text-destructive">{rootError}</p>
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Nova senha
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
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            'w-full min-h-[44px] rounded-lg bg-lime py-2.5 text-sm font-semibold text-background',
            'transition-opacity hover:opacity-90',
            'disabled:cursor-not-allowed disabled:opacity-60',
          )}
        >
          {isSubmitting ? 'Definindo senha…' : 'Definir senha e entrar'}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Já tem senha?{' '}
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
