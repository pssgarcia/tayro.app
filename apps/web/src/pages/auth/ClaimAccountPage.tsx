import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import axios from 'axios';
import { api } from '../../services/api';
import { useAuthStore, type AuthUser } from '../../stores/auth.store';
import { useClaimPreview } from '../../hooks/useClaimPreview';
import Plate from '../../components/primitives/Plate';
import PlateField from '../../components/primitives/PlateField';
import PlateActionBar from '../../components/primitives/PlateActionBar';

const schema = z.object({
  password: z.string().min(8, 'Mínimo 8 caracteres').max(72, 'Máximo 72 caracteres'),
});

type FormValues = z.infer<typeof schema>;

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
  return (
    <div>
      <Wordmark />
      <p className="text-sm text-destructive">{message}</p>
      <p className="mt-[22px] text-xs leading-[1.5] text-[#6E6E68]">
        <Link to="/login" className="font-medium text-lime hover:underline">
          Entrar com e-mail
        </Link>
      </p>
    </div>
  );
}

function PreviewSkeleton() {
  return (
    <div className="animate-pulse">
      <Wordmark />
      <div className="mb-[10px] h-[60px] w-full rounded bg-secondary" />
      <div className="mb-7 h-4 w-4/5 rounded bg-secondary" />
      <div className="h-[220px] w-full rounded-lg bg-secondary" />
    </div>
  );
}

// ─── Página ──────────────────────────────────────────────────────────────────
// Tela 12 do redesign 2a. GET /auth/claim/:token (sem consumir o token) traz
// a identidade — avatar/@handle/e-mail — e o programa da candidatura mais
// recente, pra placa confirmar "quem você é" antes de pedir a senha, igual
// ao mock. Também fecha a limitação conhecida de link inválido/expirado só
// aparecer no erro do submit: agora aparece já na carga da página. Se o
// preview falhar por outro motivo (não 401 — rede, 5xx), degrada pro
// comportamento anterior: mostra o form sem a placa de identidade, porque
// quem valida o token de verdade é o POST /auth/claim.

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

  const {
    data: preview,
    isLoading: previewLoading,
    error: previewError,
  } = useClaimPreview(token, !(accessToken && user));

  const previewInvalid =
    axios.isAxiosError(previewError) && previewError.response?.status === 401;

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

  if (!token) {
    return (
      <InvalidLinkMessage message="Link inválido — falta o token de acesso. Confira o link do e-mail." />
    );
  }

  if (previewLoading) {
    return <PreviewSkeleton />;
  }

  if (previewInvalid) {
    return (
      <InvalidLinkMessage message="Este link expirou ou já foi utilizado. Peça um novo aplicando-se novamente a um programa." />
    );
  }

  const avatarSrc = preview?.hasIgAvatar
    ? `/api/v1/ig/avatar/${preview.influencerId}`
    : preview?.avatarUrl;

  return (
    <div>
      <Wordmark />

      <h1 className="mb-[10px] font-display text-d-md leading-[1.02] text-foreground">
        Falta só
        <br />
        a senha.
      </h1>
      <p className="mb-7 text-sm leading-[1.5] text-[#8A8A85]">
        {preview?.campaignTitle
          ? `Sua candidatura ao ${preview.campaignTitle} já foi enviada. Crie uma senha para acompanhar a resposta.`
          : 'Falta só isso para acessar sua conta e acompanhar suas candidaturas.'}
      </p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Plate marks="top" flush>
          <div className="flex flex-col gap-6 px-6 pb-[26px] pt-[30px]">
            {preview && (
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 shrink-0 overflow-hidden rounded-[4px] bg-plate-fill">
                  {avatarSrc && (
                    <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-display text-[17px] font-bold tracking-[-.035em] text-plate-ink">
                    @{preview.instagramHandle}
                  </p>
                  <p className="mt-1 truncate text-xs text-plate-muted">{preview.email}</p>
                </div>
              </div>
            )}
            <PlateField
              label="Criar senha"
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
            {rootError && <p className="text-[13px] text-destructive">{rootError}</p>}
          </div>

          <PlateActionBar
            primary={{
              label: isSubmitting ? 'Ativando…' : 'Ativar minha conta',
              type: 'submit',
              disabled: isSubmitting,
              icon: <ArrowRight size={16} />,
            }}
          />
        </Plate>
      </form>

      <p className="mt-[22px] text-xs leading-[1.5] text-[#6E6E68]">
        Link inválido ou expirado?{' '}
        <Link to="/login" className="font-medium text-lime hover:underline">
          Entrar com e-mail
        </Link>
      </p>
    </div>
  );
}
