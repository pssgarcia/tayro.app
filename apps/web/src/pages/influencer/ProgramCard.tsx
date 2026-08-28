import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { Campaign } from '../../types/api';
import { formatOfferWhole } from '../../utils/format';

// O card NÃO candidata — leva pro detalhe do programa. Decidir participar é
// passo posterior, com os termos na tela (ProgramDetailPage).
//
// Todos os programas abertos têm o MESMO peso visual. Até 2026-08-28 o
// primeiro da página virava placa em destaque, mas não havia regra nenhuma
// por trás: a lista vem ordenada por createdAt desc e o corte era por página,
// então "em destaque" só queria dizer "o mais novo desta página" — na página 2
// outro programa qualquer ganhava a placa. Destaque sem critério é ruído.
// Se algum dia houver curadoria de verdade (como no lado da marca, onde
// pickFeatured escolhe o programa ativo mais cheio), a placa volta com regra.

function programPath(id: string) {
  return `/influencer/programs/${id}`;
}

interface Props {
  campaign: Campaign;
  /** índice mono, 1-based. */
  index?: number;
  className?: string;
  /** Destino do link. Default: detalhe autenticado. Visitante sem conta usa /apply/:id. */
  hrefBuilder?: (id: string) => string;
}

export default function ProgramCard({
  campaign,
  index = 1,
  className,
  hrefBuilder = programPath,
}: Props) {
  const offer = formatOfferWhole(campaign);
  const brand = campaign.brand?.name ?? 'Marca';
  const spots = `${campaign.maxSpots} vaga${campaign.maxSpots !== 1 ? 's' : ''}`;

  return (
    <div className={className}>
      <Link
        to={hrefBuilder(campaign.id)}
        className="flex w-full items-baseline gap-3.5 text-left transition-colors hover:bg-accent"
      >
        <span className="shrink-0 font-mono text-[11px] text-kinetic-muted">
          {String(index).padStart(2, '0')}
        </span>
        <span className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-semibold tracking-[-.03em] text-foreground">
            {campaign.title}
          </p>
          <p className="mt-[5px] text-xs text-kinetic-muted">
            {brand} · {spots}
          </p>
        </span>
        {offer && (
          <span className="shrink-0 text-[13px] tabular-nums text-foreground">
            {offer.prefix}
            {offer.value}
          </span>
        )}
        <ChevronRight size={14} className="shrink-0 text-kinetic-border" />
      </Link>
    </div>
  );
}
