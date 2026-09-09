import { useState } from 'react';
import axios from 'axios';
import type { Campaign } from '../../types/api';
import KineticPlate from '../../components/primitives/kinetic/KineticPlate';
import KineticActions from '../../components/primitives/kinetic/KineticActions';
import KineticTextarea from '../../components/primitives/kinetic/KineticTextarea';
import { useCreateApplication } from '../../hooks/useMyApplications';
import { useT } from '../../i18n';

// ─── Modal de confirmação — mesmo padrão de placa-formulário do Login ────────
// Só abre a partir do detalhe da campanha: a creator decide DEPOIS de ver os
// termos, nunca direto da lista.

interface Props {
  campaign: Pick<Campaign, 'id' | 'title'> & { brand?: { name: string } | null };
  onClose: () => void;
  /** Ação do CTA da tela de sucesso. Default: fechar. */
  onApplied?: () => void;
}

export default function ApplyModal({ campaign, onClose, onApplied }: Props) {
  const t = useT();
  const [message, setMessage] = useState('');
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const create = useCreateApplication();

  async function handleConfirm() {
    setError(null);
    try {
      await create.mutateAsync({
        campaignId: campaign.id,
        message: message.trim() || undefined,
      });
      setApplied(true);
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : null;
      const msg =
        axios.isAxiosError(err) && typeof err.response?.data?.message === 'string'
          ? err.response.data.message
          : null;

      if (status === 409) {
        setError(msg ?? t.app.creator.candidatar.jaSeCandidatou);
      } else if (status === 400 && msg) {
        setError(msg);
      } else {
        setError(t.app.creator.candidatar.naoFoiPossivel);
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
      onClick={onClose}
    >
      <div className="w-full sm:max-w-md" onClick={(e) => e.stopPropagation()}>
        <KineticPlate marks="top" flush className="rounded-b-none sm:rounded-b-lg">
          {applied ? (
            <div className="px-6 pb-[26px] pt-[30px] text-center">
              <p className="font-display text-[34px] font-bold leading-[1.05] tracking-[-.05em] text-black">
                {t.app.creator.candidatar.enviada}
              </p>
              <p className="mt-5 text-[13px] leading-[1.5] text-[#6a6a64]">
                <span className="font-medium text-[#3a3a34]">{campaign.brand?.name}</span>{' '}
                {t.app.creator.candidatar.vaiAnalisar}
              </p>
            </div>
          ) : (
            <div className="px-6 pb-[26px] pt-[30px]">
              <p className="font-display text-xl font-bold tracking-[-.04em] text-black">
                {t.app.creator.candidatar.titulo}
              </p>
              <p className="mt-[6px] truncate text-[13px] text-[#6a6a64]">{campaign.title}</p>

              <div className="mt-6">
                <KineticTextarea
                  label={t.app.creator.candidatar.mensagem}
                  variant="plate"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={1000}
                  placeholder={t.app.creator.candidatar.mensagemPlaceholder}
                />
              </div>

              {error && <p className="mt-4 text-[13px] text-destructive">{error}</p>}
            </div>
          )}

          <KineticActions
            actions={[
              { label: applied ? t.app.comum.fechar : t.app.acoes.cancelar, onClick: onClose, width: 130 },
              applied
                ? {
                    label: t.app.creator.candidatar.verMinhas,
                    onClick: onApplied ?? onClose,
                    primary: true,
                  }
                : {
                    label: create.isPending
                      ? t.app.creator.candidatar.enviando
                      : t.app.creator.candidatar.confirmar,
                    onClick: handleConfirm,
                    disabled: create.isPending,
                    primary: true,
                  },
            ]}
          />
        </KineticPlate>
      </div>
    </div>
  );
}
