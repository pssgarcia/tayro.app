import { FileText } from 'lucide-react';
import type { Campaign } from '../../types/api';
import KineticPlate from '../../components/primitives/kinetic/KineticPlate';
import KineticFact from '../../components/primitives/kinetic/KineticFact';
import KineticSegments from '../../components/primitives/kinetic/KineticSegments';
import CountUp from '../../components/primitives/CountUp';
import { formatCurrency, formatDate, formatOffer } from '../../utils/format';

// ─── Aba Briefing ────────────────────────────────────────────────────────────
// Migrada pro "Kinetic Editorial". Esta tela nunca chegou a seguir nem o
// redesign 2a: ainda usava `rounded-xl border bg-card p-5` como container, que
// é literalmente o "Don't" do DESIGN.md ("o padrão é tipografia direta sobre o
// fundo, sem caixa"). As três caixas viram três blocos separados por rótulo
// mono, e a OFERTA — a informação que decide se a creator entra — sobe pra
// placa, que é o lugar do que mais importa na tela.

function offerTypeLabel(type: Campaign['offerType']): string {
  if (type === 'CASH') return 'Pagamento';
  if (type === 'PRODUCT') return 'Produto';
  if (type === 'COMMISSION') return 'Comissão';
  return '—';
}

const monoLabel = 'font-mono text-[11px] uppercase tracking-widest text-kinetic-muted';

export default function CampaignOverviewTab({
  campaign,
  approvedCount,
}: {
  campaign: Campaign;
  approvedCount: number;
}) {
  // Só oferta em dinheiro ganha escala de display. Produto e comissão são
  // frase ("Kit Whey 900g + coqueteleira") e a 64px quebrariam em 3 linhas.
  const isCash = campaign.offerType === 'CASH' && campaign.offerAmount != null;
  const offerValue = formatOffer(campaign);

  // Um segmento por vaga só funciona em programa pequeno; com 50 vagas viram
  // 50 tiras de 2px. Acima de 12, a barra passa a ser proporcional.
  const segmentTotal = Math.min(campaign.maxSpots, 12);
  const segmentFilled =
    campaign.maxSpots <= 12
      ? approvedCount
      : Math.round((approvedCount / campaign.maxSpots) * segmentTotal);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-12 sm:px-6">
      <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:gap-14">
        <div className="min-w-0 flex-1">
          <p className={monoLabel}>Sobre o programa</p>

          {campaign.description ? (
            <p className="mt-5 whitespace-pre-line break-words text-[15px] leading-relaxed text-kinetic-text">
              {campaign.description}
            </p>
          ) : (
            <p className="mt-5 text-sm text-kinetic-muted">Sem descrição.</p>
          )}

          {campaign.niches.length > 0 && (
            <div className="mt-7 flex flex-wrap gap-2">
              {campaign.niches.map((n) => (
                <span
                  key={n}
                  className="border border-kinetic-gray px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[.12em] text-kinetic-muted"
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
              className="mt-7 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-lime transition-opacity hover:opacity-80"
            >
              <FileText size={13} />
              Ver briefing
            </a>
          )}
        </div>

        <div className="w-full lg:w-[420px] lg:shrink-0">
          <KineticPlate marks="all" className="px-6 py-9 sm:px-8">
            <p className="mb-4 font-mono text-[10px] uppercase tracking-widest text-[#6a6a64]">
              A oferta
            </p>

            {isCash ? (
              <CountUp>
                <span className="block font-display text-[56px] font-bold leading-[.85] tracking-[-.055em] tabular-nums text-black">
                  {offerValue}
                </span>
              </CountUp>
            ) : (
              <p className="font-display text-2xl font-bold leading-tight tracking-[-.04em] text-black">
                {offerValue}
              </p>
            )}

            <div className="my-7 h-px bg-[#c9c9c3]" />

            <div className="grid grid-cols-2 gap-5">
              <KineticFact label="Tipo" value={offerTypeLabel(campaign.offerType)} tone="plate" />
              <KineticFact
                label="Prazo de pagamento"
                value={
                  campaign.offerDeadlineDays != null
                    ? `${campaign.offerDeadlineDays} dias após aprovação`
                    : '—'
                }
                tone="plate"
              />
            </div>

            {isCash && campaign.offerDescription && (
              <p className="mt-6 text-sm leading-relaxed text-[#4a4a44]">
                {campaign.offerDescription}
              </p>
            )}
          </KineticPlate>

          <p className={`${monoLabel} mt-11`}>Detalhes</p>
          <div className="mt-5 grid grid-cols-2 gap-6">
            <KineticFact label="Prazo de candidatura" value={formatDate(campaign.deadline)} />
            <KineticFact label="Criado em" value={formatDate(campaign.createdAt)} />
            <KineticFact
              label="Total investido (estimado)"
              value={
                campaign.offerType === 'CASH' && campaign.offerAmount != null
                  ? formatCurrency(campaign.offerAmount * campaign.maxSpots)
                  : '—'
              }
              className="col-span-2"
            />
          </div>

          <p className={`${monoLabel} mt-11`}>Vagas</p>
          <p className="mt-4 font-display text-3xl font-bold tracking-[-.05em] tabular-nums text-foreground">
            {approvedCount}/{campaign.maxSpots}
          </p>
          <KineticSegments
            filled={segmentFilled}
            total={segmentTotal}
            tone="dark"
            className="mt-5"
          />
        </div>
      </div>
    </div>
  );
}
