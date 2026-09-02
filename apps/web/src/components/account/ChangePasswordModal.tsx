import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import { api } from '../../services/api';
import { useAuthStore, type AuthUser } from '../../stores/auth.store';
import KineticPlate from '../primitives/kinetic/KineticPlate';
import KineticField from '../primitives/kinetic/KineticField';
import KineticActions from '../primitives/kinetic/KineticActions';

const schema = z.object({
  currentPassword: z.string().min(1, 'Informe a senha atual'),
  newPassword: z.string().min(8, 'Mínimo 8 caracteres').max(72, 'Máximo 72 caracteres'),
});

type FormValues = z.infer<typeof schema>;

interface ChangePasswordResponse {
  accessToken: string;
  user: AuthUser;
}

// ─── Modal ───────────────────────────────────────────────────────────────────
// Mesmo shell do KineticEditField (overlay + KineticPlate + KineticActions),
// mas SEM <form>: este modal vive dentro do <form> de Perfil, e um <form>
// aninhado é HTML inválido — o navegador reconcilia a árvore de um jeito
// que quebra o form de fora. O primário dispara handleSubmit via onClick,
// igual ao "Salvar" do KineticEditField.

export default function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const setAuth = useAuthStore((s) => s.setAuth);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [rootError, setRootError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setRootError(null);
    try {
      const { data } = await api.post<ChangePasswordResponse>('/auth/change-password', values);
      setAuth(data.accessToken, data.user);
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
      if (err.response.status === 401) {
        setRootError('Senha atual incorreta.');
        return;
      }
      if (err.response.status === 400) {
        setRootError('A nova senha deve ser diferente da atual.');
        return;
      }
      if (err.response.status === 429) {
        setRootError('Muitas tentativas. Aguarde alguns minutos e tente de novo.');
        return;
      }
      setRootError('Não foi possível trocar a senha. Tente novamente.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Trocar senha"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center"
      onClick={onClose}
    >
      <div className="w-full sm:max-w-md" onClick={(e) => e.stopPropagation()}>
        <KineticPlate marks="top" flush className="rounded-b-none sm:rounded-b-lg">
          <div className="flex flex-col gap-6 px-6 pb-7 pt-11">
            {done ? (
              <p className="text-sm text-black">
                Senha alterada. Outros dispositivos logados precisarão entrar de novo.
              </p>
            ) : (
              <>
                <KineticField
                  label="Senha atual"
                  variant="plate"
                  type={showCurrent ? 'text' : 'password'}
                  autoComplete="current-password"
                  autoFocus
                  error={errors.currentPassword?.message}
                  suffix={
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowCurrent((v) => !v)}
                      className="shrink-0 text-[#8a8a84] transition-colors hover:text-black"
                      aria-label={showCurrent ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  }
                  {...register('currentPassword')}
                />
                <KineticField
                  label="Nova senha"
                  variant="plate"
                  type={showNew ? 'text' : 'password'}
                  autoComplete="new-password"
                  hint="Mínimo 8 caracteres"
                  error={errors.newPassword?.message}
                  suffix={
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowNew((v) => !v)}
                      className="shrink-0 text-[#8a8a84] transition-colors hover:text-black"
                      aria-label={showNew ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  }
                  {...register('newPassword')}
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
                      label: isSubmitting ? 'Trocando…' : 'Trocar senha',
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
