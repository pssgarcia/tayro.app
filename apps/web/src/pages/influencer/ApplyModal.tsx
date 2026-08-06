import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import axios from 'axios';
import type { Campaign } from '../../types/api';
import Plate from '../../components/primitives/Plate';
import PlateActionBar from '../../components/primitives/PlateActionBar';
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
        <Plate marks="top" flush className="rounded-b-none sm:rounded-b-lg">
          {applied ? (
            <div className="px-6 pb-[26px] pt-[30px] text-center">
              <p className="font-display text-d-lg text-plate-ink">Candidatura enviada</p>
              <p className="mt-5 text-[13px] leading-[1.5] text-plate-muted">
                <span className="font-medium text-plate-body">{campaign.brand?.name}</span> vai
                analisar seu perfil.
              </p>
            </div>
          ) : (
            <div className="px-6 pb-[26px] pt-[30px]">
              <p className="font-display text-d-xs text-plate-ink">Quero participar</p>
              <p className="mt-[6px] truncate text-[13px] text-plate-muted">{campaign.title}</p>

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

          <PlateActionBar
            secondary={{ label: applied ? 'Fechar' : 'Cancelar', onClick: onClose, width: 100 }}
            primary={
              applied
                ? { label: 'Ver minhas candidaturas', onClick: onApplied ?? onClose }
                : {
                    label: create.isPending ? 'Enviando…' : 'Confirmar',
                    onClick: handleConfirm,
                    disabled: create.isPending,
                    icon: <ArrowRight size={16} />,
                  }
            }
          />
        </Plate>
      </div>
    </div>
  );
}
