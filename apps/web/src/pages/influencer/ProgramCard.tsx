import { useState } from 'react';
import { CalendarDays, Users, ArrowRight, X, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import type { Campaign } from '../../types/api';
import Avatar from '../../components/primitives/Avatar';
import { formatDate, formatOffer } from '../../utils/format';
import { useCreateApplication } from '../../hooks/useMyApplications';
import { cn } from '../../lib/utils';

// ─── Modal de confirmação de candidatura ──────────────────────────────────────

function ApplyModal({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  const [message, setMessage] = useState('');
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const create = useCreateApplication();

  async function handleConfirm() {
    setError(null);
    try {
      await create.mutateAsync({
        campaignId: campaign.id,
        message: message.trim() || undefined,
      });
      setApplied(true);
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : null;
      const msg =
        axios.isAxiosError(err) && typeof err.response?.data?.message === 'string'
          ? err.response.data.message
          : null;

      if (status === 409) {
        setError(msg ?? 'Você já se candidatou a este programa.');
      } else if (status === 400 && msg) {
        setError(msg);
      } else {
        setError('Não foi possível enviar sua candidatura. Tente novamente.');
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl border border-border bg-card p-6 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {applied ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-lime/10">
              <CheckCircle2 size={28} className="text-lime" />
            </div>
            <div>
              <p className="font-display text-lg font-bold">Candidatura enviada!</p>
              <p className="mt-1 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{campaign.brand?.name}</span> vai
                analisar seu perfil.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full min-h-[44px] rounded-lg bg-lime py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
            >
              Fechar
            </button>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">Quero participar</h2>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mb-4 flex items-center gap-2.5">
              <Avatar
                src={campaign.brand?.logoUrl ?? undefined}
                name={campaign.brand?.name}
                size="sm"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {campaign.title}
                </p>
                <p className="text-xs text-muted-foreground">{campaign.brand?.name}</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <label className="mb-1.5 block text-xs font-medium text-foreground">
              Mensagem para a marca <span className="text-muted-foreground">(opcional)</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="Por que você seria perfeita para esse programa?"
              className="mb-4 w-full resize-none rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-lime/50 focus:outline-none focus:ring-1 focus:ring-lime/30"
            />

            <button
              onClick={handleConfirm}
              disabled={create.isPending}
              className="w-full min-h-[44px] rounded-lg bg-lime py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {create.isPending ? 'Enviando…' : 'Confirmar candidatura'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Card do programa ──────────────────────────────────────────────────────────

interface Props {
  campaign: Campaign;
}

export default function ProgramCard({ campaign }: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className={cn(
          'group flex flex-col rounded-xl border border-border bg-card p-5 text-left transition-colors',
          'hover:border-lime/30 hover:bg-card/80',
        )}
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
      </button>

      {modalOpen && <ApplyModal campaign={campaign} onClose={() => setModalOpen(false)} />}
    </>
  );
}
