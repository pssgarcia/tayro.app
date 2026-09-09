import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import { api } from '../../services/api';
import { useT, type Dictionary } from '../../i18n';
import { useAuthStore, type AuthUser } from '../../stores/auth.store';
import { redirectPath } from '../../utils/redirectPath';
import KineticPlate from '../../components/primitives/kinetic/KineticPlate';
import KineticField from '../../components/primitives/kinetic/KineticField';
import KineticActions from '../../components/primitives/kinetic/KineticActions';

// ─── Schema ───────────────────────────────────────────────────────────────────

// Schema é função do dicionário: mensagem fixa no módulo congelaria no
// idioma do boot (ver `i18n/README.md`).
const criarSchema = (t: Dictionary) =>
  z.object({
    email: z.string().email(t.app.validacao.emailInvalido),
    password: z.string().min(1, t.app.login.senhaObrigatoria),
  });

type FormValues = z.infer<ReturnType<typeof criarSchema>>;

interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

// ─── Componente ───────────────────────────────────────────────────────────────
// Tela 3 do redesign 2a. Sem header — a placa-formulário é o padrão reusado
// nos 3 cadastros, Ativar conta e nos modais de PublishModal/Entregas.

export default function LoginPage() {
  const t = useT();
  const schema = useMemo(() => criarSchema(t), [t]);
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
          setError('root', { message: t.app.login.credenciaisInvalidas });
        } else {
          setError('root', { message: t.app.login.erroConexao });
        }
      } else {
        setError('root', { message: t.app.erros.inesperado });
      }
    }
  };

  return (
    <div>
      <span className="mb-[26px] block font-display text-[26px] font-bold tracking-[-.05em] text-foreground">
        tay<span className="text-lime">ro</span>
      </span>

      <h1 className="mb-7 font-display text-[36px] font-bold leading-[.95] tracking-[-.05em] sm:text-[46px] text-foreground">
        {t.app.login.titulo}
        <br />
        {t.app.login.tituloDestaque}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <KineticPlate marks="top" flush>
          <div className="flex flex-col gap-6 px-6 pb-[26px] pt-[30px]">
            <KineticField
              label={t.app.cadastroCreator.email}
              type="email"
              variant="plate"
              autoComplete="email"
              placeholder={t.app.login.emailPlaceholder}
              error={errors.email?.message}
              {...register('email')}
            />
            <KineticField
              label={t.app.cadastroCreator.senha}
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
                  className="shrink-0 text-[#8a8a84] transition-colors hover:text-black"
                  aria-label={showPassword ? t.app.acoes.ocultarSenha : t.app.acoes.mostrarSenha}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              }
              {...register('password')}
            />
            {errors.root && <p className="text-[13px] text-destructive">{errors.root.message}</p>}
          </div>

          {/* `compact`: em 360px "Esqueci minha senha" não cabe em meia barra
              com o mono de 12px e tracking largo — quebrava em duas linhas
              ("ESQUECI MINHA / SENHA") coladas no bloco lime. O tipo encolhe
              só abaixo de sm; no desktop a barra é a de sempre. */}
          <KineticActions
            compact
            actions={[
              { label: t.app.login.esqueciSenha, to: '/forgot-password' },
              {
                label: isSubmitting ? t.app.login.entrando : t.app.acoes.entrar,
                type: 'submit',
                disabled: isSubmitting,
                primary: true,
              },
            ]}
          />
        </KineticPlate>
      </form>

      <p className="mt-[26px] text-[13px] text-kinetic-muted">
        Não tem conta?{' '}
        <Link to="/register" className="font-medium text-lime hover:underline">
          {t.app.login.cadastreSe}
        </Link>
      </p>

      <p className="mt-3 text-[13px] text-kinetic-muted">
        <Link to="/programs" className="hover:underline">
          {t.app.login.verCampanhas}
        </Link>
      </p>
    </div>
  );
}
