import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { Campaign } from '../../types/api';
import Plate from '../../components/primitives/Plate';
import CountUp from '../../components/primitives/CountUp';
import SegmentBar from '../../components/primitives/SegmentBar';
import PlateActionBar from '../../components/primitives/PlateActionBar';
import StatusPill from '../../components/primitives/StatusPill';
import { daysUntil } from '../../utils/format';

// ─── Row (padrão "Programas") ─────────────────────────────────────────────────

function CampaignRow({
  campaign,
  index,
  onClick,
}: {
  campaign: Campaign;
  index: number;
  onClick: () => void;
}) {
  const total = campaign._count.applications;
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
        <p className="mt-[5px] text-xs text-[#6E6E68]">
          {campaign.status === 'DRAFT'
            ? 'sem link publicado'
            : `${total} candidatura${total !== 1 ? 's' : ''} · ${campaign.maxSpots} vaga${campaign.maxSpots !== 1 ? 's' : ''}`}
        </p>
      </span>
      <StatusPill status={campaign.status} />
    </button>
  );
}

// ─── Placa (destaque — programa ativo mais cheio) ─────────────────────────────

function CampaignFeatured({ campaign }: { campaign: Campaign }) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const days = daysUntil(campaign.deadline);
  const approved = campaign.approvedCount ?? 0;
  const pending = campaign.pendingCount ?? 0;

  function handleCopy() {
    navigator.clipboard.writeText(`https://tayro.app/apply/${campaign.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Plate marks="top" flush className="max-w-[520px]">
      <div className="px-6 pb-6 pt-[26px]">
        <div className="mb-[22px] flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-[21px] font-bold tracking-[-.045em] text-plate-ink">
              {campaign.title}
            </p>
            <p className="mt-[5px] text-xs text-plate-muted">
              {days === null ? 'Sem prazo' : `Encerra em ${days} dias`}
            </p>
          </div>
          <StatusPill status={campaign.status} className="shrink-0" />
        </div>

        <CountUp>
          <span className="font-display text-d-xl text-plate-ink tabular-nums">
            {approved}
            <span className="text-[23px] tracking-[-.04em] text-plate-muted">
              /{campaign.maxSpots}
            </span>
          </span>
        </CountUp>
        <p className="mb-[18px] mt-3 text-xs text-plate-soft">
          vagas preenchidas · {pending} na fila
        </p>
        <SegmentBar filled={approved} total={campaign.maxSpots} />
      </div>

      <PlateActionBar
        secondary={{ label: copied ? 'Copiado!' : 'Copiar link', onClick: handleCopy, width: 100 }}
        primary={{
          label: 'Ver fila',
          onClick: () => navigate(`/brand/campaigns/${campaign.id}`),
          icon: <ArrowRight size={16} />,
        }}
      />
    </Plate>
  );
}

// ─── Componente exportado ─────────────────────────────────────────────────────

interface Props {
  campaign: Campaign;
  variant?: 'row' | 'featured';
  /** índice mono, 1-based — só usado na variant="row". */
  index?: number;
}

export default function CampaignCard({ campaign, variant = 'row', index = 1 }: Props) {
  const navigate = useNavigate();

  if (variant === 'featured') {
    return <CampaignFeatured campaign={campaign} />;
  }

  return (
    <CampaignRow
      campaign={campaign}
      index={index}
      onClick={() => navigate(`/brand/campaigns/${campaign.id}`)}
    />
  );
}
