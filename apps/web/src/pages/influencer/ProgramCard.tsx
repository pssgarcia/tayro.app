import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { Campaign } from '../../types/api';
import { formatOfferWhole } from '../../utils/format';

// O card NÃO candidata — leva pro detalhe do programa. Decidir participar é
// passo posterior, com os termos na tela (ProgramDetailPage).
//
// Card, não linha (pedido do Pedro em 2026-08-28, olhando a lista em 360): em
// grade, o par título + oferta fica legível de relance, e a oferta — que é o
// que faz a creator parar — ganha escala de display em vez de virar um número
// espremido na ponta direita de uma linha.
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
        className="flex h-full flex-col justify-between border border-kinetic-gray bg-kinetic-dark p-5 transition-colors hover:border-kinetic-border hover:bg-[#1f1f1f]"
      >
        <div>
          <div className="flex items-start justify-between gap-3">
            <p className="font-display text-lg font-semibold leading-snug tracking-[-.03em] text-foreground">
              {campaign.title}
            </p>
            <span className="shrink-0 pt-1 font-mono text-[11px] text-kinetic-muted">
              {String(index).padStart(2, '0')}
            </span>
          </div>
          {/* marca e vagas numa linha só: é assim que a creator compara dois
              programas de relance, e é o que o teste consulta. */}
          <p className="mt-2 text-xs text-kinetic-muted">
            {brand} · {spots}
          </p>
        </div>

        <div className="mt-7 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-widest text-kinetic-muted">
              A oferta
            </p>
            {offer ? (
              <p className="mt-2 truncate font-display text-2xl font-bold tracking-[-.04em] tabular-nums text-foreground">
                {offer.prefix}
                {offer.value}
              </p>
            ) : (
              <p className="mt-2 font-display text-2xl font-bold tracking-[-.04em] text-kinetic-muted">
                —
              </p>
            )}
          </div>
          <ChevronRight
            size={16}
            className="mb-1 shrink-0 text-kinetic-border transition-colors group-hover:text-foreground"
          />
        </div>
      </Link>
    </div>
  );
}
