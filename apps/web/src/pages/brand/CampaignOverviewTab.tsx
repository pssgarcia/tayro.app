import { CalendarDays, FileText, Gift, Users, Wallet } from 'lucide-react';
import type { Campaign } from '../../types/api';
import StatBlock from '../../components/primitives/StatBlock';
import ProgressBar from '../../components/primitives/ProgressBar';
import { formatCurrency, formatDate, formatOffer } from '../../utils/format';

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-2 text-foreground">
        <span className="text-lime">{icon}</span>
        <h2 className="font-display text-sm font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function offerTypeLabel(type: Campaign['offerType']): string {
  if (type === 'CASH') return 'Pagamento';
  if (type === 'PRODUCT') return 'Produto';
  return '—';
}

export default function CampaignOverviewTab({
  campaign,
  approvedCount,
}: {
  campaign: Campaign;
  approvedCount: number;
}) {
  const spotsPercent = Math.min(
    100,
    Math.round((approvedCount / campaign.maxSpots) * 100),
  );

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Sobre o programa */}
      <Section title="Sobre o programa" icon={<FileText size={16} />}>
        {campaign.description ? (
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {campaign.description}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Sem descrição.</p>
        )}

        {campaign.niches.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {campaign.niches.map((n) => (
              <span
                key={n}
                className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium capitalize text-muted-foreground"
              >
                {n}
              </span>
            ))}
          </div>
        )}

        {campaign.briefUrl && (
          <a
            href={campaign.briefUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-lime hover:underline"
          >
            <FileText size={14} />
            Ver briefing
          </a>
        )}
      </Section>

      {/* Oferta */}
      <Section title="Oferta à creator" icon={<Gift size={16} />}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatBlock label="Tipo" value={offerTypeLabel(campaign.offerType)} />
          <StatBlock
            label={campaign.offerType === 'PRODUCT' ? 'Produto' : 'Valor'}
            value={formatOffer(campaign)}
          />
          <StatBlock
            label="Prazo de pagamento"
            value={
              campaign.offerDeadlineDays != null
                ? `${campaign.offerDeadlineDays} dias após aprovação`
                : '—'
            }
          />
        </div>

        {campaign.offerType === 'CASH' &&
          campaign.offerAmount != null &&
          campaign.offerDescription && (
            <p className="mt-4 text-sm text-muted-foreground">
              {campaign.offerDescription}
            </p>
          )}
      </Section>

      {/* Detalhes */}
      <Section title="Detalhes" icon={<CalendarDays size={16} />}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatBlock
            label="Prazo de candidatura"
            value={formatDate(campaign.deadline)}
          />
          <StatBlock label="Criado em" value={formatDate(campaign.createdAt)} />
          <StatBlock
            label="Total investido (estimado)"
            value={
              campaign.offerType === 'CASH' && campaign.offerAmount != null ? (
                <span className="inline-flex items-center gap-1">
                  <Wallet size={13} className="text-muted-foreground" />
                  {formatCurrency(campaign.offerAmount * campaign.maxSpots)}
                </span>
              ) : (
                '—'
              )
            }
          />
        </div>

        {/* Vagas */}
        <div className="mt-5 border-t border-border pt-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Users size={14} />
              Vagas preenchidas
            </span>
            <span className="font-medium text-foreground tabular-nums">
              {approvedCount}/{campaign.maxSpots}
            </span>
          </div>
          <ProgressBar value={spotsPercent} />
        </div>
      </Section>
    </div>
  );
}
