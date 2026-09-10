import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import { api } from '../../services/api';
import { useT, type Dictionary } from '../../i18n';
import { useAuthStore, type AuthUser } from '../../stores/auth.store';
import KineticPlate from '../primitives/kinetic/KineticPlate';
import KineticField from '../primitives/kinetic/KineticField';
import KineticActions from '../primitives/kinetic/KineticActions';

// Schema é função do dicionário (ver RegisterInfluencerPage): mensagem fixa
// no módulo congelaria no idioma do boot.
const criarSchema = (t: Dictionary) =>
  z.object({
    currentPassword: z.string().min(1, t.app.trocarSenha.informeSenhaAtual),
    newPassword: z.string().min(8, t.app.validacao.senhaMin).max(72, t.app.validacao.max72),
  });

type FormValues = z.infer<ReturnType<typeof criarSchema>>;

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
  const t = useT();
  const schema = useMemo(() => criarSchema(t), [t]);
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
        setRootError(t.app.erros.inesperado);
        return;
      }
      if (!err.response) {
        setRootError(t.app.erros.semConexao);
        return;
      }
      if (err.response.status === 401) {
        setRootError(t.app.trocarSenha.senhaAtualIncorreta);
        return;
      }
      if (err.response.status === 400) {
        setRootError(t.app.trocarSenha.deveSerDiferente);
        return;
      }
      if (err.response.status === 429) {
        setRootError(t.app.erros.muitasTentativas);
        return;
      }
      setRootError(t.app.trocarSenha.naoFoiPossivel);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.app.trocarSenha.titulo}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center"
      onClick={onClose}
    >
      <div className="w-full sm:max-w-md" onClick={(e) => e.stopPropagation()}>
        <KineticPlate marks="top" flush className="rounded-b-none sm:rounded-b-lg">
          <div className="flex flex-col gap-6 px-6 pb-7 pt-11">
            {done ? (
              <p className="text-sm text-black">
                {t.app.trocarSenha.sucesso}
              </p>
            ) : (
              <>
                <KineticField
                  label={t.app.trocarSenha.senhaAtual}
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
                      aria-label={showCurrent ? t.app.acoes.ocultarSenha : t.app.acoes.mostrarSenha}
                    >
                      {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  }
                  {...register('currentPassword')}
                />
                <KineticField
                  label={t.app.trocarSenha.novaSenha}
                  variant="plate"
                  type={showNew ? 'text' : 'password'}
                  autoComplete="new-password"
                  hint={t.app.cadastroCreator.senhaHint}
                  error={errors.newPassword?.message}
                  suffix={
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowNew((v) => !v)}
                      className="shrink-0 text-[#8a8a84] transition-colors hover:text-black"
                      aria-label={showNew ? t.app.acoes.ocultarSenha : t.app.acoes.mostrarSenha}
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
                ? [{ label: t.app.comum.fechar, onClick: onClose, primary: true }]
                : [
                    { label: t.app.acoes.cancelar, onClick: onClose, width: 130 },
                    {
                      label: isSubmitting ? t.app.trocarSenha.trocando : t.app.trocarSenha.titulo,
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
