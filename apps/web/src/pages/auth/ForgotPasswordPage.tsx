import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/auth.store';
import { redirectPath } from '../../utils/redirectPath';
import KineticPlate from '../../components/primitives/kinetic/KineticPlate';
import KineticField from '../../components/primitives/kinetic/KineticField';
import KineticActions from '../../components/primitives/kinetic/KineticActions';

const schema = z.object({
  email: z.string().email('E-mail inválido'),
});

type FormValues = z.infer<typeof schema>;

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
        setRootError('Erro inesperado. Tente novamente.');
        return;
      }
      if (!err.response) {
        setRootError('Sem conexão com o servidor. Verifique sua internet e tente de novo.');
        return;
      }
      if (err.response.status === 429) {
        setRootError('Muitas tentativas. Aguarde alguns minutos e tente de novo.');
        return;
      }
      setRootError('Não foi possível enviar o link. Tente novamente.');
    }
  };

  return (
    <div>
      <Wordmark />

      <h1 className="mb-[10px] font-display text-[36px] font-bold leading-[.95] tracking-[-.05em] sm:text-[46px] text-foreground">
        Esqueceu
        <br />a senha?
      </h1>
      <p className="mb-7 text-sm leading-[1.5] text-kinetic-muted">
        Informe seu e-mail e mandamos um link para você definir uma senha nova.
      </p>

      {sent ? (
        <KineticPlate marks="top" flush>
          <div className="flex flex-col gap-3 px-6 pb-[26px] pt-[30px]">
            <p className="text-sm leading-[1.5] text-black">
              Se esse e-mail existir na nossa base, enviamos um link de recuperação. Confira sua
              caixa de entrada.
            </p>
          </div>
        </KineticPlate>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <KineticPlate marks="top" flush>
            <div className="flex flex-col gap-6 px-6 pb-[26px] pt-[30px]">
              <KineticField
                label="E-mail"
                type="email"
                variant="plate"
                autoComplete="email"
                placeholder="seu@email.com"
                error={errors.email?.message}
                {...register('email')}
              />
              {rootError && <p className="text-[13px] text-destructive">{rootError}</p>}
            </div>

            <KineticActions
              actions={[
                {
                  label: isSubmitting ? 'Enviando…' : 'Enviar link',
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
          Entrar
        </Link>
      </p>
    </div>
  );
}
