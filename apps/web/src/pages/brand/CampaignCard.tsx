import { useNavigate } from 'react-router-dom';
import { CalendarDays, Users } from 'lucide-react';
import type { Campaign } from '../../types/api';
import StatusPill from '../../components/primitives/StatusPill';
import ProgressBar from '../../components/primitives/ProgressBar';

function formatOffer(campaign: Campaign): string {
  if (campaign.offerType === 'CASH' && campaign.offerAmount != null) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(campaign.offerAmount / 100);
  }
  if (campaign.offerType === 'PRODUCT' && campaign.offerDescription) {
    return campaign.offerDescription;
  }
  return '—';
}

function formatDeadline(deadline: string | null): string {
  if (!deadline) return 'Sem prazo';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(deadline),
  );
}

interface Props {
  campaign: Campaign;
}

export default function CampaignCard({ campaign }: Props) {
  const navigate = useNavigate();
  const total = campaign._count.applications;
  const spotsPercent = Math.round((total / campaign.maxSpots) * 100);

  return (
    <button
      onClick={() => navigate(`/brand/campaigns/${campaign.id}`)}
      className="group w-full rounded-xl border border-border bg-card p-5 text-left transition-colors hover:border-lime/30 hover:bg-card/80"
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="font-display text-sm font-semibold leading-snug text-foreground group-hover:text-lime transition-colors line-clamp-2">
          {campaign.title}
        </p>
        <StatusPill status={campaign.status} className="shrink-0" />
      </div>

      {/* Niches */}
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

      {/* Vagas */}
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Users size={12} />
          {total} candidatura{total !== 1 ? 's' : ''} · {campaign.maxSpots} vaga{campaign.maxSpots !== 1 ? 's' : ''}
        </span>
        <span>{spotsPercent}%</span>
      </div>
      <ProgressBar value={spotsPercent} className="mb-4" />

      {/* Rodapé */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{formatOffer(campaign)}</span>
        <span className="flex items-center gap-1">
          <CalendarDays size={11} />
          {formatDeadline(campaign.deadline)}
        </span>
      </div>
    </button>
  );
}
