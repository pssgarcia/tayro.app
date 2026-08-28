import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../../hooks/useDashboard';
import KineticPlate from '../../components/primitives/kinetic/KineticPlate';
import KineticActions from '../../components/primitives/kinetic/KineticActions';
import StatFigure from '../../components/primitives/kinetic/StatFigure';
import CountUp from '../../components/primitives/CountUp';

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="animate-pulse space-y-10">
      <div className="h-[260px] max-w-[560px] rounded-lg bg-kinetic-dark" />
      <div className="grid grid-cols-2 gap-x-8 gap-y-10">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded bg-kinetic-dark" />
        ))}
      </div>
    </div>
  );
}

// ─── Página ──────────────────────────────────────────────────────────────────
// Migrada do redesign 2a pra "Kinetic Editorial" (a identidade que a aba Fila
// estreou em 2026-08-16). A hierarquia de antes continua valendo — UMA placa
// com o único sinal urgente (candidaturas pendentes), o resto desce pro Resumo
// como número normal. O que muda é a gramática: rótulo mono caixa alta, número
// maior, crop marks em lime, bloco de ação reto.
//
// Desktop põe a placa e o Resumo lado a lado (a placa tem largura fixa e
// sobrava metade da tela vazia à direita no 2a); no celular eles empilham.

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useDashboard();

  // A placa só existe em dois casos: nenhum programa ainda, ou candidatura
  // esperando análise. Fora deles a coluna da esquerda não pode ficar
  // RESERVADA — senão sobra um vão de 560px e o Resumo parece jogado no canto
  // (visto em produção local: 1 programa, 0 pendentes).
  const hasPlate = !!data && (data.campaigns.total === 0 || data.applications.pending > 0);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-12 pt-6 sm:px-6 lg:pt-10">
      <div className="flex items-end justify-between gap-4">
        <h1 className="font-display text-[42px] font-bold leading-[.9] tracking-[-.055em] text-foreground sm:text-[56px] lg:text-[72px]">
          Sua leitura
        </h1>
      </div>

      <div className="my-8 h-px bg-kinetic-gray lg:my-10" />

      {isError && (
        <p className="text-sm text-destructive">Erro ao carregar o dashboard. Tente novamente.</p>
      )}

      {isLoading && <Skeleton />}

      {!isLoading && !isError && data && (
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-16">
          {hasPlate && (
            <div className="w-full lg:w-[560px] lg:shrink-0">
              {data.campaigns.total === 0 ? (
                <>
                  <p className="mb-3.5 font-mono text-[11px] uppercase tracking-widest text-kinetic-muted">
                    Comece por aqui
                  </p>
                  <KineticPlate marks="top" flush>
                    <div className="px-6 pb-8 pt-11 sm:px-9">
                      <p className="font-display text-[26px] font-bold leading-[1.1] tracking-[-.045em] text-black">
                        Nenhum programa ainda
                      </p>
                      <p className="mt-4 max-w-[340px] text-sm leading-[1.5] text-[#4a4a44]">
                        Crie o primeiro programa para começar a receber candidaturas de creators.
                      </p>
                    </div>
                    <KineticActions
                      actions={[
                        {
                          label: 'Criar o primeiro',
                          onClick: () => navigate('/brand/campaigns/new'),
                          primary: true,
                        },
                      ]}
                    />
                  </KineticPlate>
                </>
              ) : (
                data.applications.pending > 0 && (
                  <>
                    <p className="mb-3.5 font-mono text-[11px] uppercase tracking-widest text-kinetic-muted">
                      Precisa de você
                    </p>
                    <KineticPlate marks="top" flush>
                      <div className="px-6 pb-8 pt-11 sm:px-9">
                        {/* Sem rótulo mono aqui: "Precisa de você", logo acima da
                          placa, já É o rótulo deste número. */}
                        <CountUp>
                          <span className="block font-display text-[72px] font-bold leading-[.78] tracking-[-.06em] tabular-nums text-black min-[380px]:text-[96px]">
                            {data.applications.pending}
                          </span>
                        </CountUp>
                        <p className="mt-6 max-w-[340px] text-sm leading-[1.5] text-[#4a4a44]">
                          candidatura{data.applications.pending !== 1 ? 's' : ''} esperando sua
                          análise.
                        </p>
                      </div>
                      <KineticActions
                        actions={[
                          {
                            label: 'Analisar agora',
                            onClick: () => navigate('/brand/campaigns'),
                            primary: true,
                          },
                        ]}
                      />
                    </KineticPlate>
                  </>
                )
              )}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="mb-7 font-mono text-[11px] uppercase tracking-widest text-kinetic-muted">
              Resumo
            </p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-10">
              <StatFigure
                label="programas"
                value={data.campaigns.total}
                sub={`${data.campaigns.active} ativos`}
                size="lg"
                delay={120}
              />
              <StatFigure
                label="candidaturas"
                value={data.applications.total}
                sub={`${data.applications.approved} fechadas`}
                size="lg"
                delay={240}
              />
              <StatFigure
                label="conteúdos a revisar"
                value={data.content.pendingReview}
                size="lg"
                delay={360}
              />
              <StatFigure
                label="recompensas"
                value={data.rewards.total}
                sub={`${data.rewards.delivered} entregues`}
                size="lg"
                delay={480}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
