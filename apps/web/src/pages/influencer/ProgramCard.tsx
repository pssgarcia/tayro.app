import { Link } from 'react-router-dom';
import { CalendarDays, Users, ArrowRight } from 'lucide-react';
import type { Campaign } from '../../types/api';
import Avatar from '../../components/primitives/Avatar';
import { formatDate, formatOffer } from '../../utils/format';

interface Props {
  campaign: Campaign;
}

export default function ProgramCard({ campaign }: Props) {
  return (
    <Link
      to={`/apply/${campaign.id}`}
      className="group flex flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-lime/30 hover:bg-card/80"
    >
      {/* Marca */}
      <div className="mb-3 flex items-center gap-2.5">
        <Avatar
          src={campaign.brand?.logoUrl ?? undefined}
          name={campaign.brand?.name}
          size="sm"
        />
        <span className="truncate text-xs font-medium text-muted-foreground">
          {campaign.brand?.name ?? 'Marca'}
        </span>
      </div>

      {/* Título */}
      <p className="mb-3 font-display text-sm font-semibold leading-snug text-foreground transition-colors line-clamp-2 group-hover:text-lime">
        {campaign.title}
      </p>

      {/* Nichos */}
      {campaign.niches.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {campaign.niches.slice(0, 3).map((n) => (
            <span
              key={n}
              className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium capitalize text-muted-foreground"
            >
              {n}
            </span>
          ))}
          {campaign.niches.length > 3 && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
              +{campaign.niches.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Oferta + prazo */}
      <div className="mt-auto flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
        <span className="font-semibold text-lime">{formatOffer(campaign)}</span>
        <span className="flex items-center gap-1">
          <CalendarDays size={11} />
          {formatDate(campaign.deadline)}
        </span>
      </div>

      {/* Rodapé */}
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Users size={12} />
          {campaign.maxSpots} vaga{campaign.maxSpots !== 1 ? 's' : ''}
        </span>
        <span className="flex items-center gap-1 font-medium text-foreground transition-colors group-hover:text-lime">
          Ver e candidatar
          <ArrowRight size={13} />
        </span>
      </div>
    </Link>
  );
}
