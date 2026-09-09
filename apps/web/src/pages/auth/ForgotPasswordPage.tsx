import { useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { api } from '../../services/api';
import { useT, type Dictionary } from '../../i18n';
import { useAuthStore } from '../../stores/auth.store';
import { redirectPath } from '../../utils/redirectPath';
import KineticPlate from '../../components/primitives/kinetic/KineticPlate';
import KineticField from '../../components/primitives/kinetic/KineticField';
import KineticActions from '../../components/primitives/kinetic/KineticActions';

// Schema é função do dicionário: mensagem fixa no módulo congelaria no
// idioma do boot (ver `i18n/README.md`).
const criarSchema = (t: Dictionary) =>
  z.object({
    email: z.string().email(t.app.validacao.emailInvalido),
  });

type FormValues = z.infer<ReturnType<typeof criarSchema>>;

function Wordmark() {
  return (
    <span className="mb-[26px] block font-display text-[26px] font-bold tracking-[-.05em] text-foreground">
      tay<span className="text-lime">ro</span>
    </span>
  );
}

// ─── Página ──────────────────────────────────────────────────────────────────
// Sem preview (ao contrário do /claim): a janela de validade do token é curta
// (1h) e o pedido acabou de ser feito por quem está aqui agora — não há
// ganho em confirmar identidade antes do form. Nunca revela se o e-mail
// existe: a resposta de sucesso é sempre a mesma mensagem genérica.

export default function ForgotPasswordPage() {
  const t = useT();
  const schema = useMemo(() => criarSchema(t), [t]);
  const { accessToken, user } = useAuthStore();
  const [rootError, setRootError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  if (accessToken && user) {
    return <Navigate to={redirectPath(user.role)} replace />;
  }

  const onSubmit = async (values: FormValues) => {
    setRootError(null);
    try {
      await api.post('/auth/forgot-password', { email: values.email });
      setSent(true);
    } catch (err) {
      if (!axios.isAxiosError(err)) {
        setRootError(t.app.erros.inesperado);
        return;
      }
      if (!err.response) {
        setRootError(t.app.erros.semConexao);
        return;
      }
      if (err.response.status === 429) {
        setRootError(t.app.erros.muitasTentativas);
        return;
      }
      setRootError(t.app.esqueciSenha.naoFoiPossivel);
    }
  };

  return (
    <div>
      <Wordmark />

      <h1 className="mb-[10px] font-display text-[36px] font-bold leading-[.95] tracking-[-.05em] sm:text-[46px] text-foreground">
        {t.app.esqueciSenha.titulo}
        <br />
        {t.app.esqueciSenha.tituloDestaque}
      </h1>
      <p className="mb-7 text-sm leading-[1.5] text-kinetic-muted">
        {t.app.esqueciSenha.subtitulo}
      </p>

      {sent ? (
        <KineticPlate marks="top" flush>
          <div className="flex flex-col gap-3 px-6 pb-[26px] pt-[30px]">
            <p className="text-sm leading-[1.5] text-black">
              {t.app.esqueciSenha.enviado}
            </p>
          </div>
        </KineticPlate>
      ) : (
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
              {rootError && <p className="text-[13px] text-destructive">{rootError}</p>}
            </div>

            <KineticActions
              actions={[
                {
                  label: isSubmitting ? t.app.esqueciSenha.enviando : t.app.esqueciSenha.enviarLink,
                  type: 'submit',
                  disabled: isSubmitting,
                  primary: true,
                },
              ]}
            />
          </KineticPlate>
        </form>
      )}

      <p className="mt-[22px] text-xs leading-[1.5] text-kinetic-muted">
        Lembrou a senha?{' '}
        <Link to="/login" className="font-medium text-lime hover:underline">
          {t.app.acoes.entrar}
        </Link>
      </p>
    </div>
  );
}
