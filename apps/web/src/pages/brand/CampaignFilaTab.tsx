import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';
import {
  applicationKeys,
  extractCooldownWait,
  useApproveApplication,
  useRejectApplication,
  useRefreshApplicationIg,
} from '../../hooks/useCampaignApplications';
import CountUp from '../../components/primitives/CountUp';
import CampaignPipelineMobileStory from './CampaignPipelineMobileStory';
import { formatEngagement, formatNumberParts } from '../../utils/format';
import { cn } from '../../lib/utils';
import type { Application, ApplicationStatus, Campaign } from '../../types/api';

// ─── Aba Fila — identidade "Kinetic Editorial" (aprovada 2026-08-16) ─────────
// Substitui o carrossel antigo (QueueTab/ApplicationCard). Desktop: lista
// Pipeline (TODAS as candidaturas, qualquer status — navegável, não só a fila
// de decisão) + placa clara com o detalhe da selecionada. Mobile: revisão em
// formato Story, só candidaturas PENDING (decidida sai, próxima ocupa a
// posição sozinha). Sem TopNav/Footer próprios — já está dentro do
// BrandLayout (sidebar) + CampaignHeader (título/prazo/vagas já aparecem ali
// em cima, por isso não repetimos aqui). Match score é placeholder (hash do
// id, não existe cálculo real); "Bio Note" mostra a mensagem real da
// candidatura em vez de texto inventado — ver CampaignPipelineMobileStory.tsx
// pro mesmo raciocínio do lado mobile.

const POLL_INTERVAL_MS = 6_000;
const POLL_TIMEOUT_MS = 45_000;

function placeholderMatchScore(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return 70 + (hash % 26); // 70–95, só pra dar variedade visual entre cards
}

const pipelineStatusWord: Record<ApplicationStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
};

// ─── Lista Pipeline ────────────────────────────────────────────────────────────

function PipelineRow({
  application,
  selected,
  onSelect,
}: {
  application: Application;
  selected: boolean;
  onSelect: () => void;
}) {
  const { influencer, status } = application;
  const avatarSrc = influencer.igProfilePicUrl
    ? `/api/v1/ig/avatar/${influencer.id}`
    : influencer.avatarUrl;

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected}
        className={cn(
          'flex w-full items-center justify-between rounded border p-3 text-left transition-colors',
          selected
            ? 'border-kinetic-gray bg-kinetic-dark'
            : 'border-transparent bg-transparent hover:bg-kinetic-dark',
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-kinetic-gray">
            {avatarSrc && <img src={avatarSrc} alt="" className="h-full w-full object-cover" />}
          </div>
          <span
            className={cn('truncate text-sm font-medium', selected ? 'text-white' : 'text-kinetic-text')}
          >
            {influencer.name}
          </span>
        </div>
        <span
          className={cn(
            'shrink-0 font-mono text-xs',
            status === 'PENDING' ? 'text-lime' : 'text-kinetic-muted',
          )}
        >
          {pipelineStatusWord[status]}
        </span>
      </button>
    </li>
  );
}

// ─── Placa clara com o detalhe da candidatura selecionada ────────────────────

function ProfilePlate({
  application,
  onApprove,
  onReject,
  onRefreshIg,
  isApproving,
  isRejecting,
  isRefreshingIg,
  refreshIgError,
}: {
  application: Application;
  onApprove: () => void;
  onReject: () => void;
  onRefreshIg: () => void;
  isApproving: boolean;
  isRejecting: boolean;
  isRefreshingIg: boolean;
  refreshIgError: unknown;
}) {
  const { influencer, message } = application;
  const handle = influencer.instagramHandle?.replace(/^@+/, '');
  const avatarSrc = influencer.igProfilePicUrl
    ? `/api/v1/ig/avatar/${influencer.id}`
    : influencer.avatarUrl;
  const followers =
    influencer.followersCount != null ? formatNumberParts(influencer.followersCount) : null;
  const cooldownWait = extractCooldownWait(refreshIgError);
  const igLoading = influencer.igFetchStatus === 'PENDING';
  const igFailed = influencer.igFetchStatus === 'FAILED' || influencer.igFetchStatus === null;
  const matchScore = placeholderMatchScore(application.id);
  const posts = Array.from({ length: 6 }, (_, i) => influencer.igRecentPosts?.[i] ?? null);

  return (
    // flex column de altura cheia + só a região do meio rola: aprovar/descartar
    // fica sempre visível sem precisar rolar a página (achado 2026-08-17 — o
    // card inteiro exigia scroll da página pra decidir e cortava a grade de
    // posts). `min-h-0` no meio é o que faz o overflow-y-auto respeitar a
    // altura em vez de estourar o card (mesma causa do bug corrigido no
    // mobile em CampaignPipelineMobileStory.tsx).
    <section className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-lg bg-kinetic-light text-black">
      <div className="absolute left-4 top-4 h-4 w-4 border-l border-t border-lime" />
      <div className="absolute right-4 top-4 h-4 w-4 border-r border-t border-lime" />
      <div className="absolute bottom-4 left-4 h-4 w-4 border-b border-l border-lime" />
      <div className="absolute bottom-4 right-4 h-4 w-4 border-b border-r border-lime" />

      <div className="min-h-0 flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded bg-gray-300">
              {avatarSrc && (
                <img src={avatarSrc} alt="" className="h-full w-full object-cover grayscale" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-2xl font-bold tracking-tight">{influencer.name}</h2>
              {handle && (
                <a
                  href={`https://instagram.com/${handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 flex w-fit items-center gap-1 font-mono text-sm text-gray-600 transition-colors hover:text-black"
                >
                  @{handle}
                  <ExternalLink size={12} className="shrink-0" />
                </a>
              )}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="mb-1 font-mono text-xs uppercase tracking-widest text-gray-500">
              Match Score
            </p>
            <CountUp>
              <span className="text-2xl font-bold">{matchScore}%</span>
            </CountUp>
          </div>
        </div>

        <div className="mb-6 border-b border-gray-300 pb-6">
          {igLoading ? (
            <div className="grid animate-pulse grid-cols-2 gap-6">
              <div className="h-9 w-20 rounded bg-gray-300" />
              <div className="h-9 w-20 rounded bg-gray-300" />
            </div>
          ) : igFailed ? (
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-sm text-gray-500">
                Dados do Instagram indisponíveis
              </span>
              <button
                type="button"
                onClick={onRefreshIg}
                disabled={isRefreshingIg || cooldownWait !== null}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 font-mono text-xs uppercase tracking-widest transition-colors',
                  isRefreshingIg || cooldownWait !== null
                    ? 'cursor-not-allowed text-gray-400'
                    : 'text-gray-700 hover:text-black',
                )}
              >
                <RefreshCw size={13} className={cn(isRefreshingIg && 'animate-spin')} />
                {isRefreshingIg
                  ? 'Atualizando…'
                  : cooldownWait !== null
                    ? `Tente em ${cooldownWait} min`
                    : 'Atualizar'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              {followers && (
                <div>
                  <p className="mb-1 font-mono text-xs uppercase tracking-widest text-gray-500">
                    Followers
                  </p>
                  <CountUp>
                    <span className="text-4xl font-bold tracking-tighter">
                      {followers.value}
                      {followers.suffix}
                    </span>
                  </CountUp>
                </div>
              )}
              {influencer.igEngagementRate != null && (
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <p className="font-mono text-xs uppercase tracking-widest text-gray-500">
                      Engagement
                    </p>
                    <button
                      type="button"
                      onClick={onRefreshIg}
                      disabled={isRefreshingIg}
                      aria-label="Atualizar dados do Instagram"
                      className="text-gray-400 transition-colors hover:text-black disabled:cursor-not-allowed"
                    >
                      <RefreshCw size={13} className={cn(isRefreshingIg && 'animate-spin')} />
                    </button>
                  </div>
                  <CountUp delay={140}>
                    <span className="text-4xl font-bold tracking-tighter">
                      {formatEngagement(influencer.igEngagementRate)}
                    </span>
                  </CountUp>
                </div>
              )}
            </div>
          )}
        </div>

        {message && (
          <div className="mb-6">
            <h3 className="mb-2 font-mono text-xs uppercase tracking-widest text-gray-500">
              Bio Note
            </h3>
            <p className="text-sm leading-relaxed text-gray-800">&ldquo;{message}&rdquo;</p>
          </div>
        )}

        <div>
          <h3 className="mb-3 font-mono text-xs uppercase tracking-widest text-gray-500">
            Recent Feed
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {posts.map((post, i) =>
              post ? (
                <div key={i} className="aspect-square overflow-hidden bg-gray-200">
                  <img
                    src={post.thumbnail}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover grayscale"
                  />
                </div>
              ) : (
                <div key={i} className="aspect-square bg-gray-200" />
              ),
            )}
          </div>
        </div>
      </div>

      {application.status === 'PENDING' && (
        <div className="flex shrink-0 gap-3 border-t border-gray-300 p-6 lg:px-8">
          <button
            type="button"
            onClick={onApprove}
            disabled={isApproving || isRejecting}
            className="flex-1 bg-lime px-6 py-3 font-mono font-medium uppercase tracking-widest text-black transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isApproving ? 'Aprovando…' : 'Aprovar'}
          </button>
          <button
            type="button"
            onClick={onReject}
            disabled={isApproving || isRejecting}
            className="flex-1 border border-gray-400 bg-transparent px-6 py-3 font-mono font-medium uppercase tracking-widest text-black transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRejecting ? 'Descartando…' : 'Descartar'}
          </button>
        </div>
      )}
    </section>
  );
}

// ─── Aba ───────────────────────────────────────────────────────────────────────

interface Props {
  campaign: Campaign;
  campaignId: string;
  /** Mobile: "Fechar revisão" não navega (a Fila já é a rota atual) — só sai
   * do modo imersivo de volta pro corpo normal da aba. */
  onExitMobile: () => void;
}

export default function CampaignFilaTab({ campaign, campaignId, onExitMobile }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const pollStartRef = useRef<number | null>(null);

  // Poll-while-PENDING: dado de IG assíncrono do apply pode não estar pronto
  // ainda quando a marca abre a Fila — reconsulta a cada 6s enquanto alguém
  // estiver PENDING, desiste depois de 45s contínuos (mesma regra do antigo
  // QueueTab, só que agora vale pra lista inteira, não só o carrossel).
  const { data: applications = [], isLoading: appsLoading } = useQuery({
    queryKey: applicationKeys.byCampaign(campaignId),
    queryFn: () =>
      api.get<Application[]>(`/applications/campaign/${campaignId}`).then((r) => r.data),
    enabled: !!campaignId,
    staleTime: 0,
    refetchInterval: (query) => {
      if (pollTimedOut) return false;
      const data = query.state.data as Application[] | undefined;
      return data?.some(
        (a) => a.status === 'PENDING' && a.influencer.igFetchStatus === 'PENDING',
      )
        ? POLL_INTERVAL_MS
        : false;
    },
  });

  const hasPending = applications.some(
    (a) => a.status === 'PENDING' && a.influencer.igFetchStatus === 'PENDING',
  );

  if (!hasPending && pollTimedOut) {
    setPollTimedOut(false);
  }

  useEffect(() => {
    if (!hasPending) {
      pollStartRef.current = null;
      return;
    }
    if (pollTimedOut) return;

    if (!pollStartRef.current) pollStartRef.current = Date.now();
    const remaining = POLL_TIMEOUT_MS - (Date.now() - pollStartRef.current);
    if (remaining <= 0) {
      setPollTimedOut(true);
      return;
    }

    const timer = setTimeout(() => setPollTimedOut(true), remaining);
    return () => clearTimeout(timer);
  }, [hasPending, pollTimedOut]);

  const approve = useApproveApplication(campaignId);
  const reject = useRejectApplication(campaignId);
  const refreshIg = useRefreshApplicationIg(campaignId);

  const selected = useMemo(
    () => applications.find((a) => a.id === selectedId) ?? applications[0] ?? null,
    [applications, selectedId],
  );

  return (
    <>
      {/* Desktop — candidato à esquerda (protagonista, com as fotos), lista
          Pipeline à direita (achado 2026-08-17: era o contrário). Altura
          cheia (`lg:h-full`) pras duas colunas rolarem por dentro em vez da
          página inteira rolar — é o que mantém aprovar/descartar sempre
          visível. */}
      {/* `lg:grid-rows-1` é o que faltava: sem `grid-template-rows` explícito,
          a linha do grid cresce pelo conteúdo (maior coluna) mesmo com
          `h-full` no container — os itens nunca ficavam de fato limitados à
          altura disponível, então o scroll interno da placa nunca era
          acionado. Confirmado isolando a estrutura fora do app antes de
          mexer aqui. */}
      <div className="hidden lg:grid lg:h-full lg:grid-cols-12 lg:grid-rows-1 lg:gap-8">
        <div className="lg:col-span-8 lg:h-full">
          {selected ? (
            <ProfilePlate
              application={selected}
              onApprove={() => approve.mutate(selected.id)}
              onReject={() => reject.mutate(selected.id)}
              onRefreshIg={() => refreshIg.mutate(selected.id)}
              isApproving={approve.isPending && approve.variables === selected.id}
              isRejecting={reject.isPending && reject.variables === selected.id}
              isRefreshingIg={refreshIg.isPending && refreshIg.variables === selected.id}
              refreshIgError={refreshIg.variables === selected.id ? refreshIg.error : null}
            />
          ) : (
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-kinetic-gray font-mono text-sm text-kinetic-muted">
              Selecione uma candidatura na pipeline
            </div>
          )}
        </div>

        <aside className="flex min-h-0 flex-col lg:col-span-4 lg:h-full">
          <h3 className="mb-4 shrink-0 font-mono text-xs uppercase tracking-widest text-kinetic-muted">
            Pipeline
          </h3>
          {appsLoading ? (
            <div className="h-40 animate-pulse rounded bg-kinetic-dark" />
          ) : applications.length === 0 ? (
            <p className="font-mono text-sm text-kinetic-muted">Nenhuma candidatura ainda.</p>
          ) : (
            <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
              {applications.map((app) => (
                <PipelineRow
                  key={app.id}
                  application={app}
                  selected={selected?.id === app.id}
                  onSelect={() => setSelectedId(app.id)}
                />
              ))}
            </ul>
          )}
        </aside>
      </div>

      {/* Mobile/tablet — Story imersivo, só fila PENDING */}
      <div className="lg:hidden">
        <CampaignPipelineMobileStory
          campaign={campaign}
          applications={applications}
          appsLoading={appsLoading}
          approve={approve}
          reject={reject}
          refreshIg={refreshIg}
          onExit={onExitMobile}
        />
      </div>
    </>
  );
}
