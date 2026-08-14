import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useMyApplications, useWithdrawApplication } from '../../hooks/useMyApplications';
import { useMySubmissions } from '../../hooks/useMySubmissions';
import type { MyApplication, ApplicationStatus } from '../../types/api';
import Plate from '../../components/primitives/Plate';
import CountUp from '../../components/primitives/CountUp';
import PlateActionBar from '../../components/primitives/PlateActionBar';
import StatusPill from '../../components/primitives/StatusPill';
import TabsUnderline from '../../components/primitives/TabsUnderline';
import { formatOfferWhole, formatRelativeDays } from '../../utils/format';

type Filter = 'ALL' | ApplicationStatus;

const TABS: { id: Filter; label: string }[] = [
  { id: 'ALL', label: 'Todas' },
  { id: 'PENDING', label: 'Análise' },
  { id: 'APPROVED', label: 'Fechadas' },
  { id: 'REJECTED', label: 'Recusadas' },
];

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="h-[88px] rounded-lg bg-secondary" />
      <div className="space-y-[22px]">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-10 rounded bg-secondary" />
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
  const { app, mode } = featured;
  const { campaign } = app;
  const offer = formatOfferWhole(campaign);

  return (
    <Plate marks="top" flush className="max-w-[520px]">
      <div className="px-6 pb-6 pt-[26px]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-plate-muted">{campaign.brand.name}</p>
            <p className="mt-[5px] font-display text-[21px] font-bold tracking-[-.045em] text-plate-ink">
              {campaign.title}
            </p>
          </div>
          <StatusPill status={app.status} className="shrink-0" />
        </div>

        {offer && (
          <CountUp delay={0}>
            <span className="mt-6 block font-display text-d-xl text-plate-ink tabular-nums">
              {offer.prefix && <span className="text-[23px] tracking-[-.04em]">{offer.prefix}</span>}
              {offer.value}
            </span>
          </CountUp>
        )}
        <p className="mt-3 text-xs text-plate-soft">
          {mode === 'submit'
            ? 'a receber depois que o conteúdo for aprovado'
            : mode === 'withdraw'
              ? 'aguardando resposta da marca'
              : 'candidatura decidida'}
        </p>
      </div>

      {mode === 'submit' && (
        <PlateActionBar
          primary={{
            label: 'Enviar conteúdo',
            icon: <ArrowRight size={16} />,
          }}
        />
      )}
      {mode === 'withdraw' && (
        <div className="flex border-t border-plate-line">
          <button
            type="button"
            onClick={onWithdraw}
            disabled={isWithdrawing}
            className="min-h-[56px] flex-1 font-display text-[14px] font-medium tracking-[-.02em] text-plate-muted transition-colors duration-[140ms] hover:bg-plate-ink hover:text-plate disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isWithdrawing ? 'Retirando…' : 'Retirar candidatura'}
          </button>
        </div>
      )}
    </Plate>
  );
}

// ─── Confirmação de retirada ─────────────────────────────────────────────────
// Retirar é DEFINITIVO e a consequência não é óbvia: o unique
// (campaignId, influencerId) não olha status, então `POST /applications`
// devolve 409 mesmo depois de WITHDRAWN — a creator fica trancada fora daquele
// programa pra sempre, e não existe rota de "desfazer". Por isso a confirmação
// diz o que acontece em vez de perguntar "tem certeza?". Antes disso o botão da
// placa em destaque disparava a retirada num clique só.

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
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Retirar candidatura?"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
    >
      <div className="w-full sm:max-w-md">
        <Plate marks="top" flush className="rounded-b-none sm:rounded-b-lg">
          <div className="px-6 pb-[26px] pt-[30px]">
            <p className="font-display text-d-xs text-plate-ink">Retirar candidatura?</p>
            <p className="mt-3 text-[13px] leading-[1.5] text-plate-muted">
              Sua candidatura para <strong className="font-semibold">{app.campaign.title}</strong>{' '}
              sai da fila de {app.campaign.brand.name}. Você não poderá se candidatar de novo a
              este programa.
            </p>
            {isError && (
              <p className="mt-3 text-[13px] text-destructive">
                Não foi possível retirar. Tente novamente.
              </p>
            )}
          </div>
          <PlateActionBar
            secondary={{ label: 'Cancelar', onClick: onClose, disabled: isPending, width: 100 }}
            primary={{
              label: isPending ? 'Retirando…' : 'Retirar',
              onClick: onConfirm,
              disabled: isPending,
            }}
          />
        </Plate>
      </div>
    </div>
  );
}

// ─── Página ──────────────────────────────────────────────────────────────────
// Tela 6 do redesign 2a.

export default function MyApplicationsPage() {
  const [filter, setFilter] = useState<Filter>('ALL');
  const [confirming, setConfirming] = useState<MyApplication | null>(null);
  const { data: applications = [], isLoading, isError } = useMyApplications();
  const { data: submissions = [] } = useMySubmissions();
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
    <div className="mx-auto max-w-5xl px-6 pt-[14px]">
      <div className="mb-[26px] flex items-end justify-between">
        <h1 className="font-display text-d-md text-foreground">Registro</h1>
        <p className="font-display text-d-inline leading-none tabular-nums text-foreground">
          {applications.length}
        </p>
      </div>

      {isLoading && <Skeleton />}

      {isError && (
        <p className="text-sm text-destructive">Erro ao carregar suas candidaturas. Tente novamente.</p>
      )}

      {!isLoading && !isError && applications.length === 0 && (
        <p className="text-sm text-[#8A8A85]">
          Você ainda não se candidatou a nenhum programa.{' '}
          <Link to="/influencer/browse" className="text-lime hover:underline">
            Explore os programas
          </Link>
          .
        </p>
      )}

      {!isLoading && !isError && applications.length > 0 && (
        <>
          <p className="mb-3.5 text-xs text-[#75756E]">Precisa de você</p>
          {featured && (
            <FeaturedPlate
              featured={featured}
              onWithdraw={() => setConfirming(featured.app)}
              isWithdrawing={withdraw.isPending && withdraw.variables === featured.app.id}
            />
          )}

          <TabsUnderline
            tabs={TABS}
            active={filter}
            onChange={setFilter}
            className="mb-5 mt-8 px-0"
          />

          {visible.length === 0 ? (
            <p className="text-sm text-[#8A8A85]">Nenhuma candidatura com esse status.</p>
          ) : (
            <div className="flex flex-col gap-[22px]">
              {visible.map((app, i) => (
                <div key={app.id} className="flex items-baseline gap-3.5">
                  <span className="shrink-0 font-mono text-[11px] text-[#6E6E68]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-d-xs font-semibold text-foreground">
                      {app.campaign.title}
                    </p>
                    <p className="mt-[5px] text-xs text-[#6E6E68]">
                      {app.campaign.brand.name} · {formatRelativeDays(app.appliedAt)}
                    </p>
                  </div>
                  {/* Retirar em QUALQUER pendente, não só na que está em
                      destaque: quem tinha 3 na fila só conseguia retirar a mais
                      recente, porque as linhas eram inertes. O backend sempre
                      aceitou (PATCH /applications/:id/withdraw exige apenas
                      PENDING + dono) — faltava a superfície. */}
                  {app.status === 'PENDING' && (
                    <button
                      type="button"
                      onClick={() => setConfirming(app)}
                      className="shrink-0 text-xs text-[#6E6E68] underline-offset-2 transition-colors hover:text-foreground hover:underline"
                    >
                      Retirar
                    </button>
                  )}
                  <StatusPill status={app.status} />
                </div>
              ))}
            </div>
          )}
        </>
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
