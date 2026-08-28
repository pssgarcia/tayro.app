import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays } from 'lucide-react';
import { useProgram } from '../../hooks/useProgram';
import { useMyApplications } from '../../hooks/useMyApplications';
import { formatDate, formatOffer } from '../../utils/format';
import KineticPlate from '../../components/primitives/kinetic/KineticPlate';
import StatFigure from '../../components/primitives/kinetic/StatFigure';
import StatusWord from '../../components/primitives/kinetic/StatusWord';
import ApplyModal from './ApplyModal';

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-4 w-32 rounded bg-kinetic-dark" />
      <div className="h-7 w-3/5 rounded bg-kinetic-dark" />
      <div className="h-[220px] rounded-lg bg-kinetic-dark" />
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-kinetic-dark" />
        <div className="h-3 w-4/5 rounded bg-kinetic-dark" />
      </div>
    </div>
  );
}

// ─── Página ──────────────────────────────────────────────────────────────────
// Detalhe do programa para a creator logada. É a tela de decisão: mostra os
// termos completos ANTES de qualquer candidatura — o modal de apply só abre
// daqui (o card do Abertos apenas navega para cá).

export default function ProgramDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);

  const { data: campaign, isLoading, isError } = useProgram(id);
  const { data: applications } = useMyApplications();

  // O backend tem unique (campaignId, influencerId): qualquer candidatura
  // anterior — inclusive retirada — bloqueia um novo apply com 409.
  const myApplication = applications?.find((a) => a.campaignId === id);

  const isProduct = campaign?.offerType === 'PRODUCT';
  const initials = (campaign?.brand?.name ?? '')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div className="mx-auto max-w-5xl px-4 pb-12 pt-6 sm:px-6 lg:pt-10">
      <button
        onClick={() => navigate(-1)}
        className="mb-7 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-kinetic-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft size={14} />
        Voltar
      </button>

      {isLoading && <Skeleton />}

      {isError && (
        <div className="py-16 text-center">
          <p className="font-display font-semibold text-foreground">Programa não encontrado</p>
          <p className="mt-2 text-sm text-kinetic-muted">
            Ele pode ter sido encerrado ou o link está desatualizado.
          </p>
          <Link to="/influencer/browse" className="mt-4 inline-block text-sm text-lime">
            Ver programas abertos
          </Link>
        </div>
      )}

      {campaign && (
        <div className="max-w-[560px]">
          {/* Marca */}
          <div className="mb-[22px] flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden border border-kinetic-gray bg-kinetic-dark">
              {campaign.brand?.logoUrl ? (
                <img src={campaign.brand.logoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="font-mono text-[13px] text-kinetic-muted">{initials}</span>
              )}
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-kinetic-muted">
                Programa de
              </p>
              <p className="mt-1.5 font-display text-base font-semibold tracking-[-.03em] text-foreground">
                {campaign.brand?.name ?? '—'}
              </p>
            </div>
          </div>

          <h1 className="mb-8 font-display text-[36px] font-bold leading-[.95] tracking-[-.05em] text-foreground sm:text-[46px]">
            {campaign.title}
          </h1>

          {/* Placa — a oferta (regra 5: uma placa por tela) */}
          <KineticPlate marks="all" className="p-8">
            <p className="mb-4 font-mono text-[10px] uppercase tracking-widest text-[#6a6a64]">
              O que você recebe
            </p>
            <p className="font-display text-[30px] font-bold leading-[1.05] tracking-[-.045em] text-black">
              {formatOffer(campaign)}
            </p>
            <p className="mt-3 text-[13px] text-[#6a6a64]">
              {isProduct ? 'produto enviado para você' : 'por candidatura aprovada'}
            </p>

            <div className="my-7 h-px bg-[#c9c9c3]" />
            <div className="grid grid-cols-2 gap-6">
              {campaign.offerDeadlineDays != null && (
                <StatFigure
                  label={isProduct ? 'dias até o envio' : 'dias até o pagamento'}
                  value={campaign.offerDeadlineDays}
                  size="md"
                  tone="plate"
                />
              )}
              <StatFigure
                label={`vaga${campaign.maxSpots !== 1 ? 's' : ''} aberta${campaign.maxSpots !== 1 ? 's' : ''}`}
                value={campaign.maxSpots}
                size="md"
                tone="plate"
                delay={140}
              />
            </div>
          </KineticPlate>

          {campaign.deadline && (
            <p className="mt-7 flex items-center gap-2 text-xs text-kinetic-muted">
              <CalendarDays size={13} />
              Inscrições até {formatDate(campaign.deadline)}
            </p>
          )}

          {campaign.niches.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-[7px]">
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

          <p className="mt-9 font-mono text-[11px] uppercase tracking-widest text-kinetic-muted">
            Sobre o programa
          </p>
          <p className="mt-5 whitespace-pre-line break-words text-[15px] leading-relaxed text-kinetic-text">
            {campaign.description}
          </p>

          {campaign.briefUrl && (
            <a
              href={campaign.briefUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-block font-mono text-[11px] uppercase tracking-widest text-lime transition-opacity hover:opacity-80"
            >
              Ver briefing completo
            </a>
          )}

          <div className="my-9 h-px bg-kinetic-gray" />

          {/* Decisão */}
          {myApplication ? (
            <div className="flex items-center gap-3">
              <StatusWord kind="application" status={myApplication.status} />
              <p className="text-sm text-kinetic-muted">
                Você já se candidatou a este programa.{' '}
                <Link to="/influencer/applications" className="text-lime hover:underline">
                  Ver candidatura
                </Link>
              </p>
            </div>
          ) : campaign.status !== 'ACTIVE' ? (
            <p className="text-sm text-kinetic-muted">Inscrições encerradas para este programa.</p>
          ) : (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="min-h-[60px] w-full bg-lime font-mono text-[13px] font-medium uppercase tracking-widest text-black transition-colors hover:bg-white"
            >
              Quero participar
            </button>
          )}
        </div>
      )}

      {modalOpen && campaign && (
        <ApplyModal
          campaign={campaign}
          onClose={() => setModalOpen(false)}
          onApplied={() => navigate('/influencer/applications')}
        />
      )}
    </div>
  );
}
