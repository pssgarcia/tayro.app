import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { Campaign } from '../../types/api';
import KineticPlate from '../../components/primitives/kinetic/KineticPlate';
import CountUp from '../../components/primitives/CountUp';
import KineticActions from '../../components/primitives/kinetic/KineticActions';
import { formatOfferWhole } from '../../utils/format';

// O card NÃO candidata — leva pro detalhe do programa. Decidir participar é
// passo posterior, com os termos na tela (ProgramDetailPage).

function programPath(id: string) {
  return `/influencer/programs/${id}`;
}

// ─── Row (padrão "Todos os abertos") ─────────────────────────────────────────

function ProgramRow({
  campaign,
  index,
  hrefBuilder,
}: {
  campaign: Campaign;
  index: number;
  hrefBuilder: (id: string) => string;
}) {
  const offer = formatOfferWhole(campaign);
  return (
    <Link
      to={hrefBuilder(campaign.id)}
      className="flex w-full items-baseline gap-3.5 text-left transition-colors hover:bg-accent"
    >
      <span className="shrink-0 font-mono text-[11px] text-kinetic-muted">
        {String(index).padStart(2, '0')}
      </span>
      <span className="min-w-0 flex-1">
        <p className="truncate font-display text-base font-semibold tracking-[-.03em] font-semibold text-foreground">
          {campaign.title}
        </p>
        <p className="mt-[5px] text-xs text-kinetic-muted">{campaign.brand?.name ?? 'Marca'}</p>
      </span>
      {offer && (
        <span className="shrink-0 text-[13px] tabular-nums text-foreground">
          {offer.prefix}
          {offer.value}
        </span>
      )}
      <ChevronRight size={14} className="shrink-0 text-kinetic-border" />
    </Link>
  );
}

// ─── Placa (destaque — primeiro programa da página) ──────────────────────────

function ProgramFeatured({
  campaign,
  hrefBuilder,
}: {
  campaign: Campaign;
  hrefBuilder: (id: string) => string;
}) {
  const offer = formatOfferWhole(campaign);
  return (
    <KineticPlate marks="top" flush className="max-w-[520px]">
      <div className="px-6 pb-6 pt-[26px]">
        <p className="text-xs text-[#6a6a64]">{campaign.brand?.name ?? 'Marca'}</p>
        <p className="mb-[22px] mt-[5px] font-display text-[21px] font-bold tracking-[-.045em] text-black">
          {campaign.title}
        </p>
        {offer && (
          <CountUp>
            <span className="font-display text-[40px] font-bold leading-[.85] tracking-[-.05em] text-black tabular-nums">
              {offer.prefix && (
                <span className="text-[23px] tracking-[-.04em]">{offer.prefix}</span>
              )}
              {offer.value}
            </span>
          </CountUp>
        )}
        <p className="mt-3 text-xs text-[#7a7a74]">
          por candidatura aprovada · {campaign.maxSpots} vaga{campaign.maxSpots !== 1 ? 's' : ''}
        </p>
      </div>
      <KineticActions
        actions={[{ label: 'Ver programa', to: hrefBuilder(campaign.id), primary: true }]}
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
  className?: string;
  /** Destino do link. Default: detalhe autenticado. Visitante sem conta usa /apply/:id. */
  hrefBuilder?: (id: string) => string;
}

export default function ProgramCard({
  campaign,
  variant = 'row',
  index = 1,
  className,
  hrefBuilder = programPath,
}: Props) {
  return (
    <div className={className}>
      {variant === 'featured' ? (
        <ProgramFeatured campaign={campaign} hrefBuilder={hrefBuilder} />
      ) : (
        <ProgramRow campaign={campaign} index={index} hrefBuilder={hrefBuilder} />
      )}
    </div>
  );
}
