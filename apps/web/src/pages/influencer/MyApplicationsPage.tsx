import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../../i18n';
import { useMyApplications, useWithdrawApplication } from '../../hooks/useMyApplications';
import { useMySubmissions } from '../../hooks/useMySubmissions';
import { useMyPartnershipResults } from '../../hooks/usePartnershipResults';
import { useInfluencerProfile } from '../../hooks/useInfluencerProfile';
import PartnershipResultsSection from './PartnershipResultsSection';
import type { MyApplication, ApplicationStatus } from '../../types/api';
import CountUp from '../../components/primitives/CountUp';
import KineticPlate from '../../components/primitives/kinetic/KineticPlate';
import KineticActions from '../../components/primitives/kinetic/KineticActions';
import KineticRow from '../../components/primitives/kinetic/KineticRow';
import KineticTabs from '../../components/primitives/kinetic/KineticTabs';
import StatusWord from '../../components/primitives/kinetic/StatusWord';
import { applicationStatusWord, formatOfferWhole, formatRelativeDays } from '../../utils/format';

type Filter = 'ALL' | ApplicationStatus;

// Rótulos das abas seguem o vocabulário do `applicationStatusWord`: até a
// migração pro Kinetic esta tela dizia "Análise"/"Fechadas" enquanto o status
// da linha ao lado dizia outra coisa.
// Só os ids: o rótulo vem do dicionário no render.
const TAB_IDS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const;

const monoLabel = 'font-mono text-[11px] uppercase tracking-widest text-kinetic-muted';

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="h-[220px] max-w-[560px] rounded-lg bg-kinetic-dark" />
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-14 rounded bg-kinetic-dark" />
        ))}
      </div>
    </div>
  );
}

// ─── Placa destacada — a candidatura que espera ação (regra 5) ──────────────
// Cascata: 1) APPROVED sem conteúdo enviado ainda → "Enviar conteúdo";
// 2) sem isso, a PENDING mais recente → "Retirar candidatura" (README);
// 3) sem isso (só tem decidida/com conteúdo já enviado), a mais recente,
// sem ação — caso não coberto no README, mas manter a placa vazia de ação
// parecia pior do que mostrar o item mais relevante só pra leitura.

function pickFeatured(
  applications: MyApplication[],
  submittedApplicationIds: Set<string>,
): { app: MyApplication; mode: 'submit' | 'withdraw' | 'readonly' } | null {
  const approvedNoContent = applications.find(
    (a) => a.status === 'APPROVED' && !submittedApplicationIds.has(a.id),
  );
  if (approvedNoContent) return { app: approvedNoContent, mode: 'submit' };

  const mostRecentPending = applications.find((a) => a.status === 'PENDING');
  if (mostRecentPending) return { app: mostRecentPending, mode: 'withdraw' };

  const [first] = applications;
  return first ? { app: first, mode: 'readonly' } : null;
}

function FeaturedPlate({
  featured,
  onWithdraw,
  isWithdrawing,
}: {
  featured: { app: MyApplication; mode: 'submit' | 'withdraw' | 'readonly' };
  onWithdraw: () => void;
  isWithdrawing: boolean;
}) {
  const t = useT();
  const { app, mode } = featured;
  const { campaign } = app;
  const offer = formatOfferWhole(campaign);

  return (
    <KineticPlate marks="top" flush className="max-w-[560px]">
      <div className="px-6 pb-8 pt-11 sm:px-8">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#6a6a64]">
              {campaign.brand.name}
            </p>
            <p className="mt-2 font-display text-[26px] font-bold leading-[1.1] tracking-[-.045em] text-black">
              {campaign.title}
            </p>
          </div>
          <span className="shrink-0 font-mono text-[11px] uppercase tracking-widest text-[#6a6a64]">
            {/* Mesma fonte única do resto do produto (`utils/format.ts`),
                em vez de um ternário com o vocabulário repetido aqui. */}
            {applicationStatusWord(app.status)}
          </span>
        </div>

        {offer && (
          <CountUp delay={0}>
            <span className="mt-8 block font-display text-[52px] font-bold leading-[.85] tracking-[-.055em] tabular-nums text-black">
              {offer.prefix && (
                <span className="text-[26px] tracking-[-.03em] text-[#6a6a64]">{offer.prefix}</span>
              )}
              {offer.value}
            </span>
          </CountUp>
        )}
        <p className="mt-4 text-[13px] text-[#6a6a64]">
          {mode === 'submit'
            ? t.app.creator.registro.aReceberDepois
            : mode === 'withdraw'
              ? t.app.creator.registro.aguardandoResposta
              : 'candidatura decidida'}
        </p>
      </div>

      {/* Até a migração pro Kinetic este botão não tinha `onClick` NEM rota:
          era um botão morto em produção. O destino sempre existiu — a
          SubmissionsPage lê `?apply=` e já abre o modal na candidatura certa. */}
      {mode === 'submit' && (
        <KineticActions
          actions={[
            {
              label: t.app.creator.registro.enviarConteudo,
              to: `/influencer/submissions?apply=${app.id}`,
              primary: true,
            },
          ]}
        />
      )}
      {mode === 'withdraw' && (
        <KineticActions
          actions={[
            {
              label: isWithdrawing ? t.app.creator.registro.retirando : t.app.creator.registro.retirarConfirmar,
              onClick: onWithdraw,
              disabled: isWithdrawing,
            },
          ]}
        />
      )}
    </KineticPlate>
  );
}

// ─── Confirmação de retirada ─────────────────────────────────────────────────
// Retirar é DEFINITIVO e a consequência não é óbvia: o unique
// (campaignId, influencerId) não olha status, então `POST /applications`
// devolve 409 mesmo depois de WITHDRAWN — a creator fica trancada fora daquela
// campanha pra sempre, e não existe rota de "desfazer". Por isso a confirmação
// diz o que acontece em vez de perguntar "tem certeza?".

function WithdrawModal({
  app,
  onConfirm,
  onClose,
  isPending,
  isError,
}: {
  app: MyApplication;
  onConfirm: () => void;
  onClose: () => void;
  isPending: boolean;
  isError: boolean;
}) {
  const t = useT();
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.app.creator.registro.retirarTitulo}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center"
    >
      <div className="w-full sm:max-w-md">
        <KineticPlate marks="top" flush className="rounded-b-none sm:rounded-b-lg">
          <div className="px-6 pb-7 pt-11">
            <p className="font-display text-xl font-bold tracking-[-.04em] text-black">
              {t.app.creator.registro.retirarTitulo}
            </p>
            <p className="mt-3 text-[13px] leading-[1.5] text-[#6a6a64]">
              {t.app.creator.registro.retirarAntes}{' '}
              <strong className="font-semibold text-black">{app.campaign.title}</strong>{' '}
              {t.app.creator.registro.retirarDepois(app.campaign.brand.name)}
            </p>
            {isError && (
              <p className="mt-3 text-[13px] text-destructive">
                {t.app.creator.registro.retirarErro}
              </p>
            )}
          </div>
          <KineticActions
            actions={[
              { label: t.app.acoes.cancelar, onClick: onClose, disabled: isPending, width: 130 },
              {
                label: isPending ? t.app.creator.registro.retirando : t.app.creator.registro.retirar,
                onClick: onConfirm,
                disabled: isPending,
                primary: true,
              },
            ]}
          />
        </KineticPlate>
      </div>
    </div>
  );
}

// ─── Página ──────────────────────────────────────────────────────────────────

export default function MyApplicationsPage() {
  const t = useT();
  const [filter, setFilter] = useState<Filter>('ALL');
  const [confirming, setConfirming] = useState<MyApplication | null>(null);
  const { data: applications = [], isLoading, isError } = useMyApplications();
  const { data: submissions = [] } = useMySubmissions();
  const { data: results = [] } = useMyPartnershipResults();
  // Só pelo `publicProfileEnabled`: sem ele, a seção de resultados prometeria
  // "aparece no seu perfil público" pra quem tem o perfil desligado — o mesmo
  // engano que o `PublicProfileLink` do Perfil já existe pra evitar.
  const { data: profile } = useInfluencerProfile();
  const withdraw = useWithdrawApplication();

  const submittedApplicationIds = new Set(submissions.map((s) => s.applicationId));
  const featured = pickFeatured(applications, submittedApplicationIds);

  function confirmWithdraw() {
    if (!confirming) return;
    // Fecha só no sucesso — em erro o modal fica de pé pra dar retry, em vez de
    // sumir dando a impressão de que a candidatura saiu da fila.
    withdraw.mutate(confirming.id, { onSuccess: () => setConfirming(null) });
  }

  const visible = filter === 'ALL' ? applications : applications.filter((a) => a.status === filter);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-12 pt-6 sm:px-6 lg:pt-10">
      <div className="flex items-end justify-between gap-4">
        <h1 className="font-display text-[42px] font-bold leading-[.9] tracking-[-.055em] text-foreground sm:text-[56px] lg:text-[72px]">
          {t.app.creator.registro.titulo}
        </h1>
        <p className="shrink-0 font-display text-[32px] font-bold leading-none tracking-[-.05em] tabular-nums text-foreground">
          {applications.length}
        </p>
      </div>

      <div className="my-8 h-px bg-kinetic-gray lg:my-10" />

      {isLoading && <Skeleton />}

      {isError && (
        <p className="text-sm text-destructive">
          {t.app.creator.registro.erro}
        </p>
      )}

      {!isLoading && !isError && applications.length === 0 && (
        <p className="text-sm text-kinetic-muted">
          {t.app.creator.registro.semCandidatura}{' '}
          <Link to="/influencer/browse" className="text-lime hover:underline">
            {t.app.creator.registro.explorar}
          </Link>
          .
        </p>
      )}

      {!isLoading && !isError && applications.length > 0 && (
        <>
          {/* No modo readonly a placa é só leitura (candidatura já decidida) —
              prometer "precisa de você" ali é falso. */}
          <p className={`${monoLabel} mb-4`}>
            {featured?.mode === 'readonly' ? t.app.creator.registro.ultimaCandidatura : t.app.creator.registro.precisaDeVoce}
          </p>
          {featured && (
            <FeaturedPlate
              featured={featured}
              onWithdraw={() => setConfirming(featured.app)}
              isWithdrawing={withdraw.isPending && withdraw.variables === featured.app.id}
            />
          )}

          <KineticTabs
            tabs={TAB_IDS.map((id) => ({ id: id as Filter, label: t.app.creator.registro.abas[id] }))}
            active={filter}
            onChange={setFilter}
            className="mb-6 mt-11 px-0"
          />

          {visible.length === 0 ? (
            <p className="text-sm text-kinetic-muted">{t.app.creator.registro.vazioComFiltro}</p>
          ) : (
            <div className="flex flex-col gap-0.5">
              {visible.map((app, i) => (
                <KineticRow
                  key={app.id}
                  index={i + 1}
                  title={app.campaign.title}
                  meta={`${app.campaign.brand.name} · ${formatRelativeDays(app.appliedAt)}`}
                  trailing={
                    <span className="flex shrink-0 items-center gap-4">
                      {/* Retirar em QUALQUER pendente, não só na que está em
                          destaque: quem tinha 3 na fila só conseguia retirar a
                          mais recente, porque as linhas eram inertes. */}
                      {app.status === 'PENDING' && (
                        <button
                          type="button"
                          onClick={() => setConfirming(app)}
                          className="font-mono text-[10px] uppercase tracking-widest text-kinetic-muted underline-offset-4 transition-colors hover:text-foreground hover:underline"
                        >
                          {t.app.creator.registro.retirar}
                        </button>
                      )}
                      <StatusWord kind="application" status={app.status} />
                    </span>
                  }
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* O registro de trabalho dela: o que as marcas informaram das parcerias.
          Fica abaixo da lista porque a lista é o presente (candidaturas em
          curso) e isto é o acumulado. Não renderiza nada quando está vazio. */}
      {!isLoading && !isError && (
        <PartnershipResultsSection
          results={results}
          publicProfileEnabled={profile?.publicProfileEnabled ?? false}
        />
      )}

      {confirming && (
        <WithdrawModal
          app={confirming}
          onConfirm={confirmWithdraw}
          onClose={() => setConfirming(null)}
          isPending={withdraw.isPending}
          isError={withdraw.isError}
        />
      )}
    </div>
  );
}
