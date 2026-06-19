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
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
});

type FormValues = z.infer<typeof schema>;

interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

function redirectPath(role: AuthUser['role']): string {
  if (role === 'BRAND') return '/brand';
  if (role === 'INFLUENCER') return '/influencer';
  return '/';
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function LoginPage() {
  // ── Todos os hooks ANTES de qualquer return condicional ──────────────────────
  const { accessToken, user, setAuth } = useAuthStore();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });
  // ─────────────────────────────────────────────────────────────────────────────

  // Já autenticado — só redireciona depois que todos os hooks foram chamados
  if (accessToken && user) {
    return <Navigate to={redirectPath(user.role)} replace />;
  }

  const onSubmit = async (values: FormValues) => {
    try {
      const { data } = await api.post<LoginResponse>('/auth/login', values);
      setAuth(data.accessToken, data.user);
      navigate(redirectPath(data.user.role), { replace: true });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 401 || status === 400) {
          setError('root', { message: 'Email ou senha incorretos' });
        } else {
          setError('root', { message: 'Erro de conexão. Tente novamente.' });
        }
      } else {
        setError('root', { message: 'Erro inesperado. Tente novamente.' });
      }
    }
  };

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
          Que bom te ver de novo!
        </h1>
        <p className="text-sm text-muted-foreground">
          Entre com sua conta para continuar
        </p>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {/* Erro global (credenciais / rede) */}
        {errors.root && (
          <div className="rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-3">
            <p className="text-sm text-destructive">{errors.root.message}</p>
          </div>
        )}

        {/* Email */}
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="seu@email.com"
            className={cn(
              'w-full rounded-lg border bg-secondary px-4 py-2.5 text-sm text-foreground',
              'placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-1',
              errors.email
                ? 'border-destructive focus:border-destructive focus:ring-destructive/30'
                : 'border-input focus:border-lime/50 focus:ring-lime/20',
            )}
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
              autoComplete="current-password"
              placeholder="••••••••"
              className={cn(
                'w-full rounded-lg border bg-secondary px-4 py-2.5 pr-10 text-sm text-foreground',
                'placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-1',
                errors.password
                  ? 'border-destructive focus:border-destructive focus:ring-destructive/30'
                  : 'border-input focus:border-lime/50 focus:ring-lime/20',
              )}
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
          {isSubmitting ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      {/* Link de cadastro */}
      <p className="text-center text-sm text-muted-foreground">
        Não tem conta?{' '}
        <Link
          to="/register"
          className="font-medium text-foreground underline-offset-4 hover:text-lime hover:underline"
        >
          Cadastre-se
        </Link>
      </p>
    </div>
  );
}
