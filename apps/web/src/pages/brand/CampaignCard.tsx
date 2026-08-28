import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Campaign } from '../../types/api';
import CountUp from '../../components/primitives/CountUp';
import KineticPlate from '../../components/primitives/kinetic/KineticPlate';
import KineticActions from '../../components/primitives/kinetic/KineticActions';
import KineticRow from '../../components/primitives/kinetic/KineticRow';
import KineticSegments from '../../components/primitives/kinetic/KineticSegments';
import StatusWord from '../../components/primitives/kinetic/StatusWord';
import { campaignStatusWord, daysUntil, publicUrl } from '../../utils/format';

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
    <KineticRow
      index={index}
      title={campaign.title}
      meta={
        campaign.status === 'DRAFT'
          ? 'sem link publicado'
          : `${total} candidatura${total !== 1 ? 's' : ''} · ${campaign.maxSpots} vaga${campaign.maxSpots !== 1 ? 's' : ''}`
      }
      onClick={onClick}
      trailing={<StatusWord kind="campaign" status={campaign.status} />}
    />
  );
}

// ─── Placa (destaque — programa ativo mais cheio) ─────────────────────────────

function CampaignFeatured({ campaign }: { campaign: Campaign }) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const days = daysUntil(campaign.deadline);
  const approved = campaign.approvedCount ?? 0;
  const pending = campaign.pendingCount ?? 0;

  // Um segmento por vaga só funciona em programa pequeno; acima de 12 a barra
  // vira proporcional (mesma regra da aba Briefing).
  const segmentTotal = Math.min(campaign.maxSpots, 12);
  const segmentFilled =
    campaign.maxSpots <= 12 ? approved : Math.round((approved / campaign.maxSpots) * segmentTotal);

  function handleCopy() {
    navigator.clipboard.writeText(publicUrl(`/apply/${campaign.id}`));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <KineticPlate marks="top" flush className="max-w-[560px]">
      <div className="px-6 pb-8 pt-11 sm:px-8">
        <div className="mb-7 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-display text-[26px] font-bold leading-[1.1] tracking-[-.045em] text-black">
              {campaign.title}
            </p>
            <p className="mt-2 text-[13px] text-[#6a6a64]">
              {days === null ? 'Sem prazo' : `Encerra em ${days} dias`}
            </p>
          </div>
          <span className="shrink-0 font-mono text-[11px] uppercase tracking-widest text-[#6a6a64]">
            {campaignStatusWord[campaign.status]}
          </span>
        </div>

        <CountUp>
          <span className="font-display text-[52px] font-bold leading-[.85] tracking-[-.055em] tabular-nums text-black">
            {approved}
            <span className="text-[26px] tracking-[-.03em] text-[#6a6a64]">
              /{campaign.maxSpots}
            </span>
          </span>
        </CountUp>
        <p className="mb-6 mt-4 text-[13px] text-[#6a6a64]">
          vagas preenchidas · {pending} na fila
        </p>
        <KineticSegments filled={segmentFilled} total={segmentTotal} />
      </div>

      <KineticActions
        actions={[
          { label: copied ? 'Copiado!' : 'Copiar link', onClick: handleCopy, width: 150 },
          {
            label: 'Ver detalhes',
            onClick: () => navigate(`/brand/campaigns/${campaign.id}`),
            primary: true,
          },
        ]}
      />
    </KineticPlate>
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
