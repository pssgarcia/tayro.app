import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import { api } from '../../services/api';
import { useAuthStore, type AuthUser } from '../../stores/auth.store';
import { brandProfileKeys } from '../../hooks/useBrandProfile';
import { influencerProfileKeys } from '../../hooks/useInfluencerProfile';
import KineticPlate from '../primitives/kinetic/KineticPlate';
import KineticField from '../primitives/kinetic/KineticField';
import KineticActions from '../primitives/kinetic/KineticActions';

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Informe a senha atual'),
});

type FormValues = z.infer<typeof schema>;

interface ChangeEmailResponse {
  accessToken: string;
  user: AuthUser;
}

// ─── Modal ───────────────────────────────────────────────────────────────────
// Mesmo shell (e mesmo motivo pra não ter <form>) do ChangePasswordModal —
// vive aninhado dentro do <form> de Perfil.

export default function ChangeEmailModal({
  currentEmail,
  onClose,
}: {
  currentEmail: string;
  onClose: () => void;
}) {
  const setAuth = useAuthStore((s) => s.setAuth);
  const qc = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [rootError, setRootError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: currentEmail, password: '' },
  });

  const onSubmit = async (values: FormValues) => {
    setRootError(null);
    try {
      const { data } = await api.post<ChangeEmailResponse>('/auth/change-email', values);
      setAuth(data.accessToken, data.user);
      // Não sabemos aqui se é BRAND ou INFLUENCER — invalida os dois query
      // keys; só o que existir de verdade recarrega. Não usar setQueryData
      // com a resposta do POST: o shape ({accessToken,user}) não bate com
      // BrandProfile/InfluencerProfile (mesmo footgun do close de campanha,
      // CLAUDE.md 2026-08-27).
      qc.invalidateQueries({ queryKey: brandProfileKeys.me });
      qc.invalidateQueries({ queryKey: influencerProfileKeys.me });
      setDone(true);
    } catch (err) {
      if (!axios.isAxiosError(err)) {
        setRootError('Erro inesperado. Tente novamente.');
        return;
      }
      if (!err.response) {
        setRootError('Sem conexão com o servidor. Verifique sua internet e tente de novo.');
        return;
      }
      if (err.response.status === 409) {
        const body = err.response.data as { field?: string; message?: string } | undefined;
        setError('email', { message: body?.message ?? 'Este e-mail já está em uso' });
        return;
      }
      if (err.response.status === 401) {
        setRootError('Senha incorreta.');
        return;
      }
      if (err.response.status === 400) {
        setRootError('Este já é o seu e-mail.');
        return;
      }
      if (err.response.status === 429) {
        setRootError('Muitas tentativas. Aguarde alguns minutos e tente de novo.');
        return;
      }
      setRootError('Não foi possível trocar o e-mail. Tente novamente.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Trocar e-mail"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center"
      onClick={onClose}
    >
      <div className="w-full sm:max-w-md" onClick={(e) => e.stopPropagation()}>
        <KineticPlate marks="top" flush className="rounded-b-none sm:rounded-b-lg">
          <div className="flex flex-col gap-6 px-6 pb-7 pt-11">
            {done ? (
              <p className="text-sm text-black">
                E-mail alterado. Mandamos um aviso pro endereço antigo.
              </p>
            ) : (
              <>
                <KineticField
                  label="Novo e-mail"
                  variant="plate"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  error={errors.email?.message}
                  {...register('email')}
                />
                <KineticField
                  label="Senha atual"
                  variant="plate"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  error={errors.password?.message}
                  suffix={
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((v) => !v)}
                      className="shrink-0 text-[#8a8a84] transition-colors hover:text-black"
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  }
                  {...register('password')}
                />
                {rootError && <p className="text-[13px] text-destructive">{rootError}</p>}
              </>
            )}
          </div>

          <KineticActions
            actions={
              done
                ? [{ label: 'Fechar', onClick: onClose, primary: true }]
                : [
                    { label: 'Cancelar', onClick: onClose, width: 130 },
                    {
                      label: isSubmitting ? 'Trocando…' : 'Trocar e-mail',
                      onClick: handleSubmit(onSubmit),
                      disabled: isSubmitting,
                      primary: true,
                    },
                  ]
            }
          />
        </KineticPlate>
      </div>
    </div>
  );
}
