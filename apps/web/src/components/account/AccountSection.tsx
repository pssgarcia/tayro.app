import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import ChangePasswordModal from './ChangePasswordModal';
import ChangeEmailModal from './ChangeEmailModal';

// ─── Seção "Conta" das duas telas de Perfil (marca e creator) ────────────────
// E-mail e Senha são rows interativas — mesmo visual de row do
// KineticEditField (rótulo mono + valor + chevron), mas sem herdar o
// componente porque o destino do clique não é um KineticEditField (campo
// único, onSave síncrono), é um modal com submit assíncrono, senha atual
// exigida e erro de servidor.

export default function AccountSection({ email }: { email: string }) {
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [changeEmailOpen, setChangeEmailOpen] = useState(false);

  return (
    <>
      <p className="mb-6 mt-11 font-mono text-[11px] uppercase tracking-widest text-kinetic-muted">
        Conta
      </p>
      <div className="flex flex-col gap-[22px]">
        <button
          type="button"
          onClick={() => setChangeEmailOpen(true)}
          className="flex w-full items-center gap-4 border-b border-kinetic-gray py-4 text-left transition-colors hover:bg-kinetic-dark"
        >
          <span className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-widest text-kinetic-muted">
              E-mail
            </p>
            <p className="mt-2 truncate text-[15px] text-foreground">{email}</p>
          </span>
          <ChevronRight size={14} className="shrink-0 text-kinetic-border" />
        </button>

        <button
          type="button"
          onClick={() => setChangePasswordOpen(true)}
          className="flex w-full items-center gap-4 border-b border-kinetic-gray py-4 text-left transition-colors hover:bg-kinetic-dark"
        >
          <span className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-widest text-kinetic-muted">
              Senha
            </p>
            <p className="mt-2 truncate text-[15px] text-foreground">••••••••</p>
          </span>
          <ChevronRight size={14} className="shrink-0 text-kinetic-border" />
        </button>
      </div>

      {changeEmailOpen && (
        <ChangeEmailModal currentEmail={email} onClose={() => setChangeEmailOpen(false)} />
      )}
      {changePasswordOpen && (
        <ChangePasswordModal onClose={() => setChangePasswordOpen(false)} />
      )}
    </>
  );
}
