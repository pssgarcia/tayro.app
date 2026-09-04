import { useState } from 'react';
import { ChevronRight, Download, Trash2 } from 'lucide-react';
import { api } from '../../services/api';
import ChangePasswordModal from './ChangePasswordModal';
import ChangeEmailModal from './ChangeEmailModal';
import DeleteAccountModal from './DeleteAccountModal';

// ─── Seção "Conta" das duas telas de Perfil (marca e creator) ────────────────
// E-mail e Senha são rows interativas — mesmo visual de row do
// KineticEditField (rótulo mono + valor + chevron), mas sem herdar o
// componente porque o destino do clique não é um KineticEditField (campo
// único, onSave síncrono), é um modal com submit assíncrono, senha atual
// exigida e erro de servidor.
//
// "Exportar meus dados" (LGPD art. 18 II/V) é ação direta, sem modal: baixa
// o JSON na hora via Blob — não precisa de confirmação nem de servidor
// guardar estado nenhum.

type ExportState = 'idle' | 'loading' | 'done' | 'error';

function exportPathFor(role: 'BRAND' | 'INFLUENCER'): string {
  return role === 'INFLUENCER' ? '/influencers/me/export' : '/brands/me/export';
}

export default function AccountSection({
  email,
  role,
}: {
  email: string;
  role: 'BRAND' | 'INFLUENCER';
}) {
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [changeEmailOpen, setChangeEmailOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [exportState, setExportState] = useState<ExportState>('idle');

  async function handleExport() {
    setExportState('loading');
    try {
      const { data } = await api.get(exportPathFor(role));
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tayro-meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setExportState('done');
      setTimeout(() => setExportState('idle'), 2000);
    } catch {
      setExportState('error');
    }
  }

  const exportLabel =
    exportState === 'loading'
      ? 'Exportando…'
      : exportState === 'done'
        ? 'Baixado'
        : exportState === 'error'
          ? 'Erro ao exportar. Tente de novo.'
          : 'Exportar meus dados';

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

        <button
          type="button"
          onClick={handleExport}
          disabled={exportState === 'loading'}
          aria-label="Exportar meus dados"
          className="flex w-full items-center gap-4 border-b border-kinetic-gray py-4 text-left transition-colors hover:bg-kinetic-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-widest text-kinetic-muted">
              Meus dados
            </p>
            <p className="mt-2 truncate text-[15px] text-foreground">{exportLabel}</p>
          </span>
          <Download size={14} className="shrink-0 text-kinetic-border" />
        </button>

        {/* Só creator: exclusão de marca fica fora deste escopo (D-22) —
            marca não tem o mesmo argumento de vulnerabilidade que motivou
            a decisão, e abrir isso é escopo novo. */}
        {role === 'INFLUENCER' && (
          <button
            type="button"
            onClick={() => setDeleteAccountOpen(true)}
            className="flex w-full items-center gap-4 border-b border-kinetic-gray py-4 text-left transition-colors hover:bg-kinetic-dark"
          >
            <span className="min-w-0 flex-1">
              <p className="font-mono text-[10px] uppercase tracking-widest text-destructive">
                Apagar minha conta
              </p>
              <p className="mt-2 text-[13px] text-kinetic-muted">
                Irreversível. Seus dados de identificação são removidos.
              </p>
            </span>
            <Trash2 size={14} className="shrink-0 text-destructive" />
          </button>
        )}
      </div>

      {changeEmailOpen && (
        <ChangeEmailModal currentEmail={email} onClose={() => setChangeEmailOpen(false)} />
      )}
      {changePasswordOpen && (
        <ChangePasswordModal onClose={() => setChangePasswordOpen(false)} />
      )}
      {deleteAccountOpen && (
        <DeleteAccountModal onClose={() => setDeleteAccountOpen(false)} />
      )}
    </>
  );
}
