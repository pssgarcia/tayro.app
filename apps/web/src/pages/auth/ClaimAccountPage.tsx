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
import { useClaimPreview } from '../../hooks/useClaimPreview';
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

interface ClaimResponse {
  accessToken: string;
  user: AuthUser;
}

// ─── Sub-blocos ─────────────────────────────────────────────────────────────

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
        <Link to="/login" className="font-medium text-lime hover:underline">
          {t.app.ativarConta.entrarComEmail}
        </Link>
      </p>
    </div>
  );
}

function PreviewSkeleton() {
  return (
    <div className="animate-pulse">
      <Wordmark />
      <div className="mb-[10px] h-[60px] w-full rounded bg-kinetic-dark" />
      <div className="mb-7 h-4 w-4/5 rounded bg-kinetic-dark" />
      <div className="h-[220px] w-full rounded-lg bg-kinetic-dark" />
    </div>
  );
}

// ─── Página ──────────────────────────────────────────────────────────────────
// Tela 12 do redesign 2a. GET /auth/claim/:token (sem consumir o token) traz
// a identidade — avatar/@handle/e-mail — e a campanha da candidatura mais
// recente, pra placa confirmar "quem você é" antes de pedir a senha, igual
// ao mock. Também fecha a limitação conhecida de link inválido/expirado só
// aparecer no erro do submit: agora aparece já na carga da página. Se o
// preview falhar por outro motivo (não 401 — rede, 5xx), degrada pro
// comportamento anterior: mostra o form sem a placa de identidade, porque
// quem valida o token de verdade é o POST /auth/claim.

export default function ClaimAccountPage() {
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

  const {
    data: preview,
    isLoading: previewLoading,
    error: previewError,
  } = useClaimPreview(token, !(accessToken && user));

  const previewInvalid = axios.isAxiosError(previewError) && previewError.response?.status === 401;

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
        setRootError(t.app.erros.inesperado);
        return;
      }
      if (!err.response) {
        setRootError(t.app.erros.semConexao);
        return;
      }
      if (err.response.status === 401) {
        setRootError(
          t.app.ativarConta.linkExpirado,
        );
        return;
      }
      if (err.response.status === 429) {
        setRootError(t.app.erros.muitasTentativas);
        return;
      }
      setRootError(t.app.ativarConta.naoFoiPossivel);
    }
  };

  if (!token) {
    return (
      <InvalidLinkMessage message={t.app.ativarConta.linkSemToken} />
    );
  }

  if (previewLoading) {
    return <PreviewSkeleton />;
  }

  if (previewInvalid) {
    return (
      <InvalidLinkMessage message={t.app.ativarConta.linkExpirado} />
    );
  }

  // A foto vem embutida na prévia (ver ClaimPreview.igAvatarDataUri): sem
  // sessão e com perfil público desligado, /ig/avatar/:id responderia 404.
  const avatarSrc = preview?.igAvatarDataUri ?? preview?.avatarUrl;

  return (
    <div>
      <Wordmark />

      <h1 className="mb-[10px] font-display text-[36px] font-bold leading-[.95] tracking-[-.05em] sm:text-[46px] leading-[1.02] text-foreground">
        {t.app.ativarConta.titulo}
        <br />
        {t.app.ativarConta.tituloDestaque}
      </h1>
      <p className="mb-7 text-sm leading-[1.5] text-kinetic-muted">
        {preview?.campaignTitle
          ? t.app.ativarConta.comCandidatura(preview.campaignTitle)
          : t.app.ativarConta.subtitulo}
      </p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <KineticPlate marks="top" flush>
          <div className="flex flex-col gap-6 px-6 pb-[26px] pt-[30px]">
            {preview && (
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 shrink-0 overflow-hidden rounded-[4px] bg-[#cfcfc8]">
                  {avatarSrc && (
                    <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-display text-[17px] font-bold tracking-[-.035em] text-black">
                    @{preview.instagramHandle}
                  </p>
                  <p className="mt-1 truncate text-xs text-[#6a6a64]">{preview.email}</p>
                </div>
              </div>
            )}
            <KineticField
              label={t.app.ativarConta.criarSenha}
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
                label: isSubmitting ? t.app.ativarConta.ativando : t.app.ativarConta.ativar,
                type: 'submit',
                disabled: isSubmitting,
                primary: true,
              },
            ]}
          />
        </KineticPlate>
      </form>

      <p className="mt-[22px] text-xs leading-[1.5] text-kinetic-muted">
        {t.app.ativarConta.linkInvalidoPergunta}{' '}
        <Link to="/login" className="font-medium text-lime hover:underline">
          {t.app.ativarConta.entrarComEmail}
        </Link>
      </p>
    </div>
  );
}
