import { Link } from 'react-router-dom';
import { useMyApplications } from '../../hooks/useMyApplications';
import { useMyRewards } from '../../hooks/useMyRewards';
import CountUp from '../../components/primitives/CountUp';
import KineticPlate from '../../components/primitives/kinetic/KineticPlate';
import KineticSegments from '../../components/primitives/kinetic/KineticSegments';
import KineticRow from '../../components/primitives/kinetic/KineticRow';
import StatFigure from '../../components/primitives/kinetic/StatFigure';
import StatusWord from '../../components/primitives/kinetic/StatusWord';
import { cn } from '../../lib/utils';

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="animate-pulse space-y-10">
      <div className="h-[240px] max-w-[560px] rounded-lg bg-kinetic-dark" />
      <div className="flex max-w-[560px] gap-4">
        <div className="h-20 flex-1 rounded bg-kinetic-dark" />
        <div className="h-20 flex-1 rounded bg-kinetic-dark" />
      </div>
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-14 rounded bg-kinetic-dark" />
        ))}
      </div>
    </div>
  );
}

// ─── Página ──────────────────────────────────────────────────────────────────
// Migrada do redesign 2a pra "Kinetic Editorial". A placa continua carregando o
// maior número da tela (a taxa de conversão) e o registro continua mostrando só
// as 3 candidaturas mais recentes — o que muda é a gramática visual.
//
// O status das linhas passa de `StatusPill` (pill com fundo sólido, vocabulário
// "Análise"/"Fechada") pra `StatusWord` (palavra mono, "Pendente"/"Aprovada"),
// que é o vocabulário que a Fila já usa em produção. Vocabulário único nas duas
// pontas: a marca e a creator passam a ler a mesma palavra pro mesmo estado.

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

  // O bloco "a receber" só vai a lime quando há algo a receber: lime é ação, e
  // destacar um zero gasta o orçamento da tela apontando pra nada.

  return (
    <div className="mx-auto max-w-5xl px-4 pb-12 pt-6 sm:px-6 lg:pt-10">
      <h1 className="font-display text-[42px] font-bold leading-[.9] tracking-[-.055em] text-foreground sm:text-[56px] lg:text-[72px]">
        Sua leitura
      </h1>

      <div className="my-8 h-px bg-kinetic-gray lg:my-10" />

      {isLoading ? (
        <Skeleton />
      ) : (
        <>
          <KineticPlate marks="all" className="max-w-[560px] px-6 pb-9 pt-11 sm:px-9">
            {rate === null ? (
              <>
                <p
                  aria-hidden
                  className="font-display text-[72px] font-bold leading-[.78] tracking-[-.06em] text-black/20 min-[380px]:text-[96px]"
                >
                  —
                </p>
                <p className="mt-6 text-sm leading-[1.5] text-[#4a4a44]">
                  Nenhuma candidatura ainda.
                </p>
              </>
            ) : (
              <>
                {/* O número precisa ser filho de texto DIRETO do span e o "%"
                    precisa ficar aninhado — é assim que a tela distingue "sem
                    taxa" de "taxa zero", e o que os testes consultam. */}
                <CountUp>
                  <span className="block font-display text-[72px] font-bold leading-[.78] tracking-[-.06em] tabular-nums text-black min-[380px]:text-[96px]">
                    {rate}
                    <span className="text-[38px] tracking-[-.04em] text-[#6a6a64]">%</span>
                  </span>
                </CountUp>
                <p className="mt-6 text-sm leading-[1.5] text-[#4a4a44]">
                  {approvedApps} das suas {totalApps} candidaturas viraram parceria.
                </p>
                <KineticSegments filled={barFilled} total={barTotal} className="mt-7" />
              </>
            )}
          </KineticPlate>

          <div className="mt-9 flex max-w-[560px] gap-4">
            <StatFigure
              label="em análise"
              value={pendingApps}
              delay={120}
              className="flex-1 border border-kinetic-gray p-4 sm:p-5"
            />
            <Link to="/influencer/rewards" className="flex-1">
              <StatFigure
                label="a receber"
                value={pendingRewards}
                highlight={pendingRewards > 0}
                delay={240}
                className={cn(
                  'h-full border p-4 sm:p-5',
                  pendingRewards > 0 ? 'border-lime' : 'border-kinetic-gray',
                )}
              />
            </Link>
          </div>

          <p className="mb-5 mt-11 font-mono text-[11px] uppercase tracking-widest text-kinetic-muted">
            Registro
          </p>

          {recentApps.length === 0 ? (
            <p className="text-sm text-kinetic-muted">
              Nenhuma candidatura ainda.{' '}
              <Link to="/influencer/browse" className="text-lime hover:underline">
                Explore os programas
              </Link>
              .
            </p>
          ) : (
            <div className="flex flex-col gap-0.5">
              {recentApps.map((app, i) => (
                <KineticRow
                  key={app.id}
                  index={i + 1}
                  title={app.campaign.title}
                  meta={app.campaign.brand.name}
                  trailing={<StatusWord kind="application" status={app.status} />}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
