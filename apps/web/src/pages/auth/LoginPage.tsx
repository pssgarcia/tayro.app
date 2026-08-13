import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import axios from 'axios';
import { api } from '../../services/api';
import { useAuthStore, type AuthUser } from '../../stores/auth.store';
import Plate from '../../components/primitives/Plate';
import PlateField from '../../components/primitives/PlateField';
import PlateActionBar from '../../components/primitives/PlateActionBar';

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
// Tela 3 do redesign 2a. Sem header — a placa-formulário é o padrão reusado
// nos 3 cadastros, Ativar conta e nos modais de PublishModal/Entregas.

export default function LoginPage() {
  const { accessToken, user, setAuth } = useAuthStore();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

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
    <div>
      <span className="mb-[26px] block font-display text-[26px] font-bold tracking-[-.05em] text-foreground">
        tay<span className="text-lime">ro</span>
      </span>

      <h1 className="mb-7 font-display text-d-md text-foreground">
        Que bom te ver
        <br />
        de novo.
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Plate marks="top" flush>
          <div className="flex flex-col gap-6 px-6 pb-[26px] pt-[30px]">
            <PlateField
              label="E-mail"
              type="email"
              variant="plate"
              autoComplete="email"
              placeholder="seu@email.com"
              error={errors.email?.message}
              {...register('email')}
            />
            <PlateField
              label="Senha"
              type={showPassword ? 'text' : 'password'}
              variant="plate"
              autoComplete="current-password"
              placeholder="••••••••"
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
            {errors.root && <p className="text-[13px] text-destructive">{errors.root.message}</p>}
          </div>

          {/* O secundário "Esqueci" do mock saiu daqui: não existe fluxo de
              recuperação de senha (nem endpoint nem tela), então o botão ficava
              clicável em produção sem fazer nada. Botão morto é pior que botão
              ausente — quem esquece a senha ao menos não perde tempo tentando.
              Volta quando POST /auth/forgot-password existir. */}
          <PlateActionBar
            primary={{
              label: isSubmitting ? 'Entrando…' : 'Entrar',
              type: 'submit',
              disabled: isSubmitting,
              icon: <ArrowRight size={16} />,
            }}
          />
        </Plate>
      </form>

      <p className="mt-[26px] text-[13px] text-[#75756E]">
        Não tem conta?{' '}
        <Link to="/register" className="font-medium text-lime hover:underline">
          Cadastre-se
        </Link>
      </p>

      <p className="mt-3 text-[13px] text-[#75756E]">
        <Link to="/programs" className="hover:underline">
          Ver programas abertos
        </Link>
      </p>
    </div>
  );
}
