import { useState } from 'react';
import axios from 'axios';
import type { Campaign } from '../../types/api';
import KineticPlate from '../../components/primitives/kinetic/KineticPlate';
import KineticActions from '../../components/primitives/kinetic/KineticActions';
import PlateTextarea from '../../components/primitives/PlateTextarea';
import { useCreateApplication } from '../../hooks/useMyApplications';

// ─── Modal de confirmação — mesmo padrão de placa-formulário do Login ────────
// Só abre a partir do detalhe do programa: a creator decide DEPOIS de ver os
// termos, nunca direto da lista.

interface Props {
  campaign: Pick<Campaign, 'id' | 'title'> & { brand?: { name: string } | null };
  onClose: () => void;
  /** Ação do CTA da tela de sucesso. Default: fechar. */
  onApplied?: () => void;
}

export default function ApplyModal({ campaign, onClose, onApplied }: Props) {
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
        setError(msg ?? 'Você já se candidatou a este programa.');
      } else if (status === 400 && msg) {
        setError(msg);
      } else {
        setError('Não foi possível enviar sua candidatura. Tente novamente.');
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
                Candidatura enviada
              </p>
              <p className="mt-5 text-[13px] leading-[1.5] text-[#6a6a64]">
                <span className="font-medium text-[#3a3a34]">{campaign.brand?.name}</span> vai
                analisar seu perfil.
              </p>
            </div>
          ) : (
            <div className="px-6 pb-[26px] pt-[30px]">
              <p className="font-display text-xl font-bold tracking-[-.04em] text-black">
                Quero participar
              </p>
              <p className="mt-[6px] truncate text-[13px] text-[#6a6a64]">{campaign.title}</p>

              <div className="mt-6">
                <PlateTextarea
                  label="Mensagem para a marca (opcional)"
                  variant="plate"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={1000}
                  placeholder="Por que você é ideal para esse programa?"
                />
              </div>

              {error && <p className="mt-4 text-[13px] text-destructive">{error}</p>}
            </div>
          )}

          <KineticActions
            actions={[
              { label: applied ? 'Fechar' : 'Cancelar', onClick: onClose, width: 130 },
              applied
                ? {
                    label: 'Ver minhas candidaturas',
                    onClick: onApplied ?? onClose,
                    primary: true,
                  }
                : {
                    label: create.isPending ? 'Enviando…' : 'Confirmar',
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
