import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays } from 'lucide-react';
import { useProgram } from '../../hooks/useProgram';
import { useMyApplications } from '../../hooks/useMyApplications';
import { formatDate, formatOffer } from '../../utils/format';
import Plate from '../../components/primitives/Plate';
import CountUp from '../../components/primitives/CountUp';
import StatusPill from '../../components/primitives/StatusPill';
import ApplyModal from './ApplyModal';

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-4 w-32 rounded bg-secondary" />
      <div className="h-7 w-3/5 rounded bg-secondary" />
      <div className="h-[180px] rounded-lg bg-secondary" />
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-secondary" />
        <div className="h-3 w-4/5 rounded bg-secondary" />
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
    <div className="mx-auto max-w-5xl px-6 pt-[14px]">
      <button
        onClick={() => navigate(-1)}
        className="mb-[22px] flex items-center gap-[7px] text-[13px] text-[#75756E] transition-colors hover:text-foreground"
      >
        <ArrowLeft size={14} />
        Voltar
      </button>

      {isLoading && <Skeleton />}

      {isError && (
        <div className="py-16 text-center">
          <p className="font-display font-semibold text-foreground">Programa não encontrado</p>
          <p className="mt-1 text-sm text-[#75756E]">
            Ele pode ter sido encerrado ou o link está desatualizado.
          </p>
          <Link to="/influencer/browse" className="mt-4 inline-block text-sm text-lime">
            Ver programas abertos
          </Link>
        </div>
      )}

      {campaign && (
        <div className="max-w-[520px] pb-10">
          {/* Marca */}
          <div className="mb-[22px] flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[4px] bg-muted">
              {campaign.brand?.logoUrl ? (
                <img src={campaign.brand.logoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="font-mono text-[13px] text-[#75756E]">{initials}</span>
              )}
            </div>
            <div>
              <p className="text-xs text-[#75756E]">Programa de</p>
              <p className="mt-[3px] font-display text-[15px] font-semibold tracking-[-.025em] text-foreground">
                {campaign.brand?.name ?? '—'}
              </p>
            </div>
          </div>

          <h1 className="mb-[26px] font-display text-d-md leading-none text-foreground">
            {campaign.title}
          </h1>

          {/* Placa — a oferta (regra 5: uma placa por tela) */}
          <Plate marks="all">
            <p className="mb-3 font-mono text-[9px] uppercase tracking-[.16em] text-plate-muted">
              O que você recebe
            </p>
            <p className="font-display text-[26px] font-bold leading-[1.04] tracking-[-.045em] text-plate-ink">
              {formatOffer(campaign)}
            </p>
            <p className="mt-2.5 text-xs text-plate-muted">
              {isProduct ? 'produto enviado para você' : 'por candidatura aprovada'}
            </p>

            <div className="mb-5 mt-[22px] h-px bg-plate-line" />
            <div className="flex gap-[30px]">
              {campaign.offerDeadlineDays != null && (
                <div>
                  <CountUp>
                    <span className="font-display text-d-xl text-plate-ink tabular-nums">
                      {campaign.offerDeadlineDays}
                    </span>
                  </CountUp>
                  <p className="mt-3 text-xs text-plate-soft">
                    {isProduct ? 'dias até o envio' : 'dias até o pagamento'}
                  </p>
                </div>
              )}
              <div>
                <CountUp delay={140}>
                  <span className="font-display text-d-xl text-plate-ink tabular-nums">
                    {campaign.maxSpots}
                  </span>
                </CountUp>
                <p className="mt-3 text-xs text-plate-soft">
                  vaga{campaign.maxSpots !== 1 ? 's' : ''} aberta
                  {campaign.maxSpots !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </Plate>

          {campaign.deadline && (
            <p className="mt-[22px] flex items-center gap-2 text-xs text-[#75756E]">
              <CalendarDays size={13} />
              Inscrições até {formatDate(campaign.deadline)}
            </p>
          )}

          {campaign.niches.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-[7px]">
              {campaign.niches.map((n) => (
                <span
                  key={n}
                  className="rounded-[3px] border border-[#232323] px-[9px] py-[5px] text-[11px] capitalize text-[#8A8A85]"
                >
                  {n}
                </span>
              ))}
            </div>
          )}

          <h2 className="mt-[30px] font-display text-d-xs text-foreground">Sobre o programa</h2>
          <p className="mt-3 whitespace-pre-line break-words text-sm leading-[1.55] text-[#8A8A85]">
            {campaign.description}
          </p>

          {campaign.briefUrl && (
            <a
              href={campaign.briefUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block text-sm text-[#5B8EFF] hover:underline"
            >
              Ver briefing completo
            </a>
          )}

          <div className="my-[30px] h-px bg-muted" />

          {/* Decisão */}
          {myApplication ? (
            <div className="flex items-center gap-3">
              <StatusPill status={myApplication.status} />
              <p className="text-sm text-[#8A8A85]">
                Você já se candidatou a este programa.{' '}
                <Link to="/influencer/applications" className="text-lime hover:underline">
                  Ver candidatura
                </Link>
              </p>
            </div>
          ) : campaign.status !== 'ACTIVE' ? (
            <p className="text-sm text-[#75756E]">Inscrições encerradas para este programa.</p>
          ) : (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="min-h-[52px] w-full rounded-lg bg-lime text-[15px] font-semibold tracking-[-.02em] text-background transition-opacity hover:opacity-90"
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
