import { Link } from 'react-router-dom';
import { useMyApplications } from '../../hooks/useMyApplications';
import { useMyRewards } from '../../hooks/useMyRewards';
import Plate from '../../components/primitives/Plate';
import CountUp from '../../components/primitives/CountUp';
import SegmentBar from '../../components/primitives/SegmentBar';
import StatBlock from '../../components/primitives/StatBlock';
import StatusPill from '../../components/primitives/StatusPill';

// ─── Skeleton ────────────────────────────────────────────────────────────────
// "Barra 88px de altura pra placa (não card), retângulos sem borda pros
// stats" (README §Interações e estados).

function Skeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="h-[88px] rounded-lg bg-secondary" />
      <div className="flex gap-3.5">
        <div className="h-20 flex-1 rounded-lg bg-secondary" />
        <div className="h-20 flex-1 rounded-lg bg-secondary" />
      </div>
      <div className="space-y-[22px]">
        <div className="h-4 w-24 rounded bg-secondary" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-10 rounded bg-secondary" />
        ))}
      </div>
    </div>
  );
}

// ─── Página ──────────────────────────────────────────────────────────────────
// Tela 1 do redesign 2a. A placa carrega a taxa de conversão (maior número da
// tela); o registro de candidaturas mostra só as 3 mais recentes.

export default function DashboardPage() {
  const { data: applications, isLoading: appsLoading } = useMyApplications();
  const { data: rewards, isLoading: rewardsLoading } = useMyRewards();

  const isLoading = appsLoading || rewardsLoading;

  const totalApps = applications?.length ?? 0;
  const approvedApps = applications?.filter((a) => a.status === 'APPROVED').length ?? 0;
  const pendingApps = applications?.filter((a) => a.status === 'PENDING').length ?? 0;
  const pendingRewards = rewards?.filter((r) => r.status !== 'DELIVERED').length ?? 0;

  const rate = totalApps > 0 ? Math.round((approvedApps / totalApps) * 100) : null;
  const barTotal = Math.min(totalApps, 7);
  const barFilled = Math.min(approvedApps, barTotal);

  const recentApps = applications?.slice(0, 3) ?? [];

  return (
    <div className="mx-auto max-w-5xl px-6 pt-[14px]">
      <h1 className="mb-7 font-display text-d-md text-foreground">Sua leitura</h1>

      {isLoading ? (
        <Skeleton />
      ) : (
        <>
          <Plate marks="all" className="max-w-[520px]">
            {rate === null ? (
              <>
                <p
                  aria-hidden
                  className="font-display text-[72px] font-bold leading-[.76] tracking-[-.075em] text-plate-ink/[.2] min-[340px]:text-d-hero"
                >
                  —
                </p>
                <p className="mt-5 text-sm leading-[1.5] text-plate-dim">
                  Nenhuma candidatura ainda.
                </p>
              </>
            ) : (
              <>
                <CountUp>
                  <span className="font-display text-[72px] font-bold leading-[.76] tracking-[-.075em] text-plate-ink tabular-nums min-[340px]:text-d-hero">
                    {rate}
                    <span className="text-[38px] tracking-[-.05em]">%</span>
                  </span>
                </CountUp>
                <p className="mt-5 text-sm leading-[1.5] text-plate-dim">
                  {approvedApps} das suas {totalApps} candidaturas viraram parceria.
                </p>
                <SegmentBar filled={barFilled} total={barTotal} className="mt-[22px]" />
              </>
            )}
          </Plate>

          <div className="mt-8 flex max-w-[520px] gap-3.5">
            <StatBlock label="em análise" value={pendingApps} delay={120} />
            <Link to="/influencer/rewards" className="flex-1">
              <StatBlock label="a receber" value={pendingRewards} highlight delay={240} />
            </Link>
          </div>

          <h2 className="mb-5 mt-9 font-display text-d-xs text-foreground">Registro</h2>

          {recentApps.length === 0 ? (
            <p className="text-sm text-[#8A8A85]">
              Nenhuma candidatura ainda.{' '}
              <Link to="/influencer/browse" className="text-lime hover:underline">
                Explore os programas
              </Link>
              .
            </p>
          ) : (
            <div className="flex flex-col gap-[22px]">
              {recentApps.map((app, i) => (
                <div key={app.id} className="flex items-baseline gap-3.5">
                  <span className="shrink-0 font-mono text-[11px] text-[#6E6E68]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-d-xs font-semibold text-foreground">
                      {app.campaign.title}
                    </p>
                    <p className="mt-[5px] text-xs text-[#6E6E68]">{app.campaign.brand.name}</p>
                  </div>
                  <StatusPill status={app.status} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
