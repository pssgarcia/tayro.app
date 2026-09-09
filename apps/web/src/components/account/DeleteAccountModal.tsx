import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import { api } from '../../services/api';
import { useT } from '../../i18n';
import { useAuthStore } from '../../stores/auth.store';
import KineticPlate from '../primitives/kinetic/KineticPlate';
import KineticField from '../primitives/kinetic/KineticField';
import KineticActions from '../primitives/kinetic/KineticActions';

// ─── Apagar conta (LGPD art. 18 VI, D-22) ────────────────────────────────────
// Irreversível e sem link de recuperação — a confirmação diz a CONSEQUÊNCIA
// em vez de perguntar "tem certeza?", mesmo padrão do WithdrawModal
// (MyApplicationsPage). A senha atual já é a fricção deliberada: sem
// checkbox extra. Sem <form>, mesmo motivo dos outros modais de Conta: este
// vive dentro do <form> de Perfil.

export default function DeleteAccountModal({ onClose }: { onClose: () => void }) {
  const t = useT();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleConfirm() {
    if (!password) {
      setError(t.app.apagarConta.informeSenha);
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post('/auth/delete-account', { password });
      // A conta não existe mais — landing, não /login (não faz sentido
      // convidar pra entrar de novo numa conta que acabou de ser apagada).
      clearAuth();
      navigate('/', { replace: true });
    } catch (err) {
      setIsSubmitting(false);
      if (!axios.isAxiosError(err)) {
        setError(t.app.erros.inesperado);
        return;
      }
      if (!err.response) {
        setError(t.app.erros.semConexao);
        return;
      }
      if (err.response.status === 401) {
        setError(t.app.apagarConta.senhaIncorreta);
        return;
      }
      if (err.response.status === 429) {
        setError(t.app.erros.muitasTentativas);
        return;
      }
      setError(t.app.apagarConta.naoFoiPossivel);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.app.apagarConta.titulo}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center"
      onClick={onClose}
    >
      <div className="w-full sm:max-w-md" onClick={(e) => e.stopPropagation()}>
        <KineticPlate marks="top" flush className="rounded-b-none sm:rounded-b-lg">
          <div className="flex flex-col gap-6 px-6 pb-7 pt-11">
            <div>
              <p className="font-display text-xl font-bold tracking-[-.04em] text-black">
                {t.app.apagarConta.titulo}
              </p>
              <p className="mt-3 text-[13px] leading-[1.5] text-[#6a6a64]">
                {t.app.apagarConta.consequencia}
              </p>
            </div>
            <KineticField
              id="delete-account-password"
              label={t.app.trocarSenha.senhaAtual}
              variant="plate"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={error ?? undefined}
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
            />
          </div>
          <KineticActions
            actions={[
              { label: t.app.acoes.cancelar, onClick: onClose, disabled: isSubmitting, width: 130 },
              {
                label: isSubmitting ? t.app.apagarConta.apagando : t.app.apagarConta.titulo,
                onClick: handleConfirm,
                disabled: isSubmitting,
                primary: true,
              },
            ]}
          />
        </KineticPlate>
      </div>
    </div>
  );
}
