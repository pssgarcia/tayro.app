import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Pencil, Send, Trash2, X } from 'lucide-react';
import type { Campaign } from '../../types/api';
import {
  useCloseCampaign,
  useDeleteCampaign,
  usePublishCampaign,
} from '../../hooks/useCampaigns';
import Plate from '../../components/primitives/Plate';
import PlateActionBar from '../../components/primitives/PlateActionBar';
import { cn } from '../../lib/utils';

// Ações de ciclo de vida do programa. Os 4 endpoints (publish/update/close/
// delete) existiam desde o começo e nenhum tinha tela: um rascunho salvo sem
// publicar na hora ficava preso em DRAFT pra sempre, e nenhum programa jamais
// chegava a CLOSED em produção (auditoria 2026-08-13).
//
// Quais ações aparecem é derivado do status, nunca hardcoded — mesma regra da
// máquina de estados do backend (DRAFT→ACTIVE→CLOSED):
//   DRAFT  → Publicar (a saída do beco), Editar, Excluir
//   ACTIVE → Encerrar
//   CLOSED/COMPLETED → nenhuma (estado terminal)
//
// As três que mudam estado são irreversíveis, então todas passam por uma
// confirmação que diz o que acontece — não um "tem certeza?" genérico.

// ─── Confirmação (placa-modal, mesmo padrão do PublishModal) ─────────────────

function ConfirmModal({
  title,
  body,
  confirmLabel,
  pendingLabel,
  isPending,
  isError,
  onConfirm,
  onClose,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  pendingLabel: string;
  isPending: boolean;
  isError: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
    >
      <div className="w-full sm:max-w-md">
        <Plate marks="top" flush className="rounded-b-none sm:rounded-b-lg">
          <div className="px-6 pb-[26px] pt-[30px]">
            <p className="font-display text-d-xs text-plate-ink">{title}</p>
            <p className="mt-3 text-[13px] leading-[1.5] text-plate-muted">{body}</p>
            {isError && (
              <p className="mt-4 text-[13px] text-destructive">
                Não foi possível concluir. Tente novamente.
              </p>
            )}
          </div>
          <PlateActionBar
            secondary={{ label: 'Cancelar', onClick: onClose, disabled: isPending, width: 100 }}
            primary={{
              label: isPending ? pendingLabel : confirmLabel,
              onClick: onConfirm,
              disabled: isPending,
            }}
          />
        </Plate>
      </div>
    </div>
  );
}

// ─── Botão de ação inline ────────────────────────────────────────────────────
// Ghost por padrão. `tone="primary"` reserva o único orçamento de lime da tela
// (regra 4 do 2a) pra ação que destrava o programa: publicar.

const actionClasses =
  'flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-lg px-[14px] py-[9px] font-display text-[13px] font-semibold tracking-[-.02em] transition-colors';

function ActionButton({
  label,
  icon,
  onClick,
  tone = 'ghost',
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  tone?: 'ghost' | 'primary' | 'destructive';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        actionClasses,
        tone === 'primary' && 'border border-lime text-lime hover:bg-lime/10',
        tone === 'ghost' && 'border border-[#232323] text-[#75756E] hover:text-foreground',
        tone === 'destructive' &&
          'border border-[#232323] text-[#75756E] hover:border-destructive/40 hover:text-destructive',
      )}
    >
      {icon}
      {label}
    </button>
  );
}

// ─── Barra de ações ──────────────────────────────────────────────────────────

type Dialog = 'publish' | 'close' | 'delete' | null;

export default function CampaignActions({ campaign }: { campaign: Campaign }) {
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<Dialog>(null);

  const publish = usePublishCampaign();
  const close = useCloseCampaign();
  const remove = useDeleteCampaign();

  const isDraft = campaign.status === 'DRAFT';
  const isActive = campaign.status === 'ACTIVE';

  // Estado terminal: nada a fazer, e uma barra vazia só ocuparia espaço.
  if (!isDraft && !isActive) return null;

  // Em erro, o modal FICA aberto — quem falhou quer tentar de novo, e fechar
  // por baixo do usuário esconderia que nada aconteceu. O catch é obrigatório:
  // mutateAsync rejeita, e sem ele o clique vira unhandled rejection. A
  // mensagem vem do isError da própria mutation.
  async function run(action: () => Promise<unknown>, onDone?: () => void) {
    try {
      await action();
      setDialog(null);
      onDone?.();
    } catch {
      /* estado de erro já exposto por `isError` */
    }
  }

  const handlePublish = () => run(() => publish.mutateAsync(campaign.id));
  const handleClose = () => run(() => close.mutateAsync(campaign.id));
  const handleDelete = () =>
    // O programa deixou de existir — ficar no detalhe daria 404 no próximo fetch.
    run(() => remove.mutateAsync(campaign.id), () => navigate('/brand/campaigns'));

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 px-6 pb-[18px]">
        {isDraft && (
          <>
            <ActionButton
              label="Publicar"
              tone="primary"
              icon={<Send size={13} />}
              onClick={() => setDialog('publish')}
            />
            {/* Editar é navegação pura — <Link> com o mesmo visual do botão,
                sem duplicar o estilo (mesmo acordo do PlateActionBar.to). */}
            <Link
              to={`/brand/campaigns/${campaign.id}/edit`}
              className={cn(
                actionClasses,
                'border border-[#232323] text-[#75756E] hover:text-foreground',
              )}
            >
              <Pencil size={13} />
              Editar
            </Link>
            <ActionButton
              label="Excluir"
              tone="destructive"
              icon={<Trash2 size={13} />}
              onClick={() => setDialog('delete')}
            />
          </>
        )}

        {isActive && (
          <ActionButton
            label="Encerrar"
            icon={<X size={13} />}
            onClick={() => setDialog('close')}
          />
        )}
      </div>

      {dialog === 'publish' && (
        <ConfirmModal
          title="Publicar programa?"
          body="O link de candidatura fica ativo na hora e creators já podem se inscrever. Depois de publicado o programa não volta para rascunho e os detalhes não podem mais ser editados."
          confirmLabel="Publicar"
          pendingLabel="Publicando…"
          isPending={publish.isPending}
          isError={publish.isError}
          onConfirm={handlePublish}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog === 'close' && (
        <ConfirmModal
          title="Encerrar programa?"
          body="O link de candidatura para de aceitar novas creators. As candidaturas que já entraram continuam na fila, e você segue aprovando conteúdo e registrando pagamentos normalmente. Não dá para reabrir."
          confirmLabel="Encerrar"
          pendingLabel="Encerrando…"
          isPending={close.isPending}
          isError={close.isError}
          onConfirm={handleClose}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog === 'delete' && (
        <ConfirmModal
          title="Excluir rascunho?"
          body="O programa some da sua lista para sempre. Como ele nunca foi publicado, nenhuma creator chegou a ver ou se candidatar."
          confirmLabel="Excluir"
          pendingLabel="Excluindo…"
          isPending={remove.isPending}
          isError={remove.isError}
          onConfirm={handleDelete}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  );
}
