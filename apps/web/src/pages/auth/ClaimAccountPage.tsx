import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
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

const schema = z.object({
  password: z.string().min(8, 'Mínimo 8 caracteres').max(72, 'Máximo 72 caracteres'),
});

type FormValues = z.infer<typeof schema>;

interface ClaimResponse {
  accessToken: string;
  user: AuthUser;
}

// ─── Página ──────────────────────────────────────────────────────────────────
// Tela 12 do redesign 2a. O mock mostra a placa confirmando "quem você é"
// (avatar/@handle/e-mail) antes de pedir a senha — não dá pra reproduzir: não
// existe endpoint pra validar o token e trazer essa identidade antes do
// submit (limitação conhecida, já registrada no CLAUDE.md). A placa aqui só
// carrega o campo de senha; inventar um preview sem dado real ficaria pior
// que não ter.

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

  if (!token) {
    return (
      <div>
        <span className="mb-[26px] block font-display text-[26px] font-bold tracking-[-.05em] text-foreground">
          tay<span className="text-lime">ro</span>
        </span>
        <p className="text-sm text-destructive">
          Link inválido — falta o token de acesso. Confira o link do e-mail.
        </p>
        <p className="mt-[22px] text-xs leading-[1.5] text-[#6E6E68]">
          <Link to="/login" className="font-medium text-lime hover:underline">
            Entrar com e-mail
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <span className="mb-[26px] block font-display text-[26px] font-bold tracking-[-.05em] text-foreground">
        tay<span className="text-lime">ro</span>
      </span>

      <h1 className="mb-[10px] font-display text-d-md leading-[1.02] text-foreground">
        Falta só
        <br />
        a senha.
      </h1>
      <p className="mb-7 text-sm leading-[1.5] text-[#8A8A85]">
        Falta só isso para acessar sua conta e acompanhar suas candidaturas.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Plate marks="top" flush>
          <div className="flex flex-col gap-6 px-6 pb-[26px] pt-[30px]">
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
