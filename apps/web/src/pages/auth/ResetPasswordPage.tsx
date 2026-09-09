import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
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

// Schema é função do dicionário: mensagem fixa no módulo congelaria no
// idioma do boot (ver `i18n/README.md`).
const criarSchema = (t: Dictionary) =>
  z.object({
    password: z.string().min(8, t.app.validacao.senhaMin).max(72, t.app.validacao.max72),
  });

type FormValues = z.infer<ReturnType<typeof criarSchema>>;

interface ResetResponse {
  accessToken: string;
  user: AuthUser;
}

function Wordmark() {
  return (
    <span className="mb-[26px] block font-display text-[26px] font-bold tracking-[-.05em] text-foreground">
      tay<span className="text-lime">ro</span>
    </span>
  );
}

function InvalidLinkMessage({ message }: { message: string }) {
  const t = useT();

  return (
    <div>
      <Wordmark />
      <p className="text-sm text-destructive">{message}</p>
      <p className="mt-[22px] text-xs leading-[1.5] text-kinetic-muted">
        <Link to="/forgot-password" className="font-medium text-lime hover:underline">
          {t.app.redefinirSenha.pedirNovoLink}
        </Link>
      </p>
    </div>
  );
}

// ─── Página ──────────────────────────────────────────────────────────────────
// Sem preview (diferente do /claim): o TTL de 1h é curto e quem chegou aqui
// acabou de pedir o link — link inválido/expirado só aparece no erro do
// submit (401), quem valida de verdade é o POST /auth/reset-password.
// Redirect pós-sucesso é por papel: reset serve BRAND e INFLUENCER, ao
// contrário do claim (que é influencer-only e sempre vai pra /influencer).

export default function ResetPasswordPage() {
  const t = useT();
  const schema = useMemo(() => criarSchema(t), [t]);
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
    return <Navigate to={redirectPath(user.role)} replace />;
  }

  if (!token) {
    return (
      <InvalidLinkMessage message={t.app.redefinirSenha.linkSemToken} />
    );
  }

  const onSubmit = async (values: FormValues) => {
    setRootError(null);
    try {
      const { data } = await api.post<ResetResponse>('/auth/reset-password', {
        token,
        password: values.password,
      });
      setAuth(data.accessToken, data.user);
      navigate(redirectPath(data.user.role), { replace: true });
    } catch (err) {
      if (!axios.isAxiosError(err)) {
        setRootError(t.app.erros.inesperado);
        return;
      }
      if (!err.response) {
        setRootError(t.app.erros.semConexao);
        return;
      }
      if (err.response.status === 401) {
        setRootError(t.app.redefinirSenha.linkExpirado);
        return;
      }
      if (err.response.status === 429) {
        setRootError(t.app.erros.muitasTentativas);
        return;
      }
      setRootError(t.app.redefinirSenha.naoFoiPossivel);
    }
  };

  return (
    <div>
      <Wordmark />

      <h1 className="mb-[10px] font-display text-[36px] font-bold leading-[.95] tracking-[-.05em] sm:text-[46px] text-foreground">
        {t.app.redefinirSenha.titulo}
        <br />
        {t.app.redefinirSenha.tituloDestaque}
      </h1>
      <p className="mb-7 text-sm leading-[1.5] text-kinetic-muted">
        {t.app.redefinirSenha.subtitulo}
      </p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <KineticPlate marks="top" flush>
          <div className="flex flex-col gap-6 px-6 pb-[26px] pt-[30px]">
            <KineticField
              label={t.app.redefinirSenha.novaSenha}
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
                  className="shrink-0 text-[#8a8a84] transition-colors hover:text-black"
                  aria-label={showPassword ? t.app.acoes.ocultarSenha : t.app.acoes.mostrarSenha}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              }
              {...register('password')}
            />
            {rootError && <p className="text-[13px] text-destructive">{rootError}</p>}
          </div>

          <KineticActions
            actions={[
              {
                label: isSubmitting ? t.app.redefinirSenha.redefinindo : t.app.redefinirSenha.redefinir,
                type: 'submit',
                disabled: isSubmitting,
                primary: true,
              },
            ]}
          />
        </KineticPlate>
      </form>

      <p className="mt-[22px] text-xs leading-[1.5] text-kinetic-muted">
        {t.app.redefinirSenha.linkInvalidoPergunta}{' '}
        <Link to="/forgot-password" className="font-medium text-lime hover:underline">
          {t.app.redefinirSenha.pedirNovoLink}
        </Link>
      </p>
    </div>
  );
}
