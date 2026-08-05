import { useState } from 'react';
import { ArrowRight, ChevronRight } from 'lucide-react';
import axios from 'axios';
import type { Campaign } from '../../types/api';
import Plate from '../../components/primitives/Plate';
import CountUp from '../../components/primitives/CountUp';
import PlateActionBar from '../../components/primitives/PlateActionBar';
import PlateTextarea from '../../components/primitives/PlateTextarea';
import { useCreateApplication } from '../../hooks/useMyApplications';
import { formatOfferWhole } from '../../utils/format';

// ─── Modal de confirmação — mesmo padrão de placa-formulário do Login ────────

function ApplyModal({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
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
                ? { label: 'Ver minhas candidaturas', onClick: onClose }
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

// ─── Row (padrão "Todos os abertos") ─────────────────────────────────────────

function ProgramRow({
  campaign,
  index,
  onClick,
}: {
  campaign: Campaign;
  index: number;
  onClick: () => void;
}) {
  const offer = formatOfferWhole(campaign);
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-baseline gap-3.5 text-left transition-colors hover:bg-accent"
    >
      <span className="shrink-0 font-mono text-[11px] text-[#6E6E68]">
        {String(index).padStart(2, '0')}
      </span>
      <span className="min-w-0 flex-1">
        <p className="truncate font-display text-d-xs font-semibold text-foreground">
          {campaign.title}
        </p>
        <p className="mt-[5px] text-xs text-[#6E6E68]">{campaign.brand?.name ?? 'Marca'}</p>
      </span>
      {offer && (
        <span className="shrink-0 text-[13px] tabular-nums text-foreground">
          {offer.prefix}
          {offer.value}
        </span>
      )}
      <ChevronRight size={14} className="shrink-0 text-[#4A4A46]" />
    </button>
  );
}

// ─── Placa (destaque — primeiro programa da página) ──────────────────────────

function ProgramFeatured({ campaign, onClick }: { campaign: Campaign; onClick: () => void }) {
  const offer = formatOfferWhole(campaign);
  return (
    <Plate marks="top" flush className="max-w-[520px]">
      <div className="px-6 pb-6 pt-[26px]">
        <p className="text-xs text-plate-muted">{campaign.brand?.name ?? 'Marca'}</p>
        <p className="mb-[22px] mt-[5px] font-display text-[21px] font-bold tracking-[-.045em] text-plate-ink">
          {campaign.title}
        </p>
        {offer && (
          <CountUp>
            <span className="font-display text-d-xl text-plate-ink tabular-nums">
              {offer.prefix && <span className="text-[23px] tracking-[-.04em]">{offer.prefix}</span>}
              {offer.value}
            </span>
          </CountUp>
        )}
        <p className="mt-3 text-xs text-plate-soft">
          por candidatura aprovada · {campaign.maxSpots} vaga{campaign.maxSpots !== 1 ? 's' : ''}
        </p>
      </div>
      <PlateActionBar primary={{ label: 'Ver programa', onClick, icon: <ArrowRight size={16} /> }} />
    </Plate>
  );
}

// ─── Componente exportado ─────────────────────────────────────────────────────

interface Props {
  campaign: Campaign;
  variant?: 'row' | 'featured';
  /** índice mono, 1-based — só usado na variant="row". */
  index?: number;
  className?: string;
}

export default function ProgramCard({ campaign, variant = 'row', index = 1, className }: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className={className}>
      {variant === 'featured' ? (
        <ProgramFeatured campaign={campaign} onClick={() => setModalOpen(true)} />
      ) : (
        <ProgramRow campaign={campaign} index={index} onClick={() => setModalOpen(true)} />
      )}

      {modalOpen && (
        <ApplyModal campaign={campaign} onClose={() => setModalOpen(false)} />
      )}
    </div>
  );
}
