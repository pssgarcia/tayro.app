import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight } from 'lucide-react';
import type { Campaign } from '../../types/api';
import Plate from '../../components/primitives/Plate';
import CountUp from '../../components/primitives/CountUp';
import PlateActionBar from '../../components/primitives/PlateActionBar';
import { formatOfferWhole } from '../../utils/format';

// O card NÃO candidata — leva pro detalhe do programa. Decidir participar é
// passo posterior, com os termos na tela (ProgramDetailPage).

function programPath(id: string) {
  return `/influencer/programs/${id}`;
}

// ─── Row (padrão "Todos os abertos") ─────────────────────────────────────────

function ProgramRow({ campaign, index }: { campaign: Campaign; index: number }) {
  const offer = formatOfferWhole(campaign);
  return (
    <Link
      to={programPath(campaign.id)}
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
    </Link>
  );
}

// ─── Placa (destaque — primeiro programa da página) ──────────────────────────

function ProgramFeatured({ campaign }: { campaign: Campaign }) {
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
      <PlateActionBar
        primary={{
          label: 'Ver programa',
          to: programPath(campaign.id),
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
  className?: string;
}

export default function ProgramCard({ campaign, variant = 'row', index = 1, className }: Props) {
  return (
    <div className={className}>
      {variant === 'featured' ? (
        <ProgramFeatured campaign={campaign} />
      ) : (
        <ProgramRow campaign={campaign} index={index} />
      )}
    </div>
  );
}
