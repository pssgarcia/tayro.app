import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useDashboard } from '../../hooks/useDashboard';
import Plate from '../../components/primitives/Plate';
import CountUp from '../../components/primitives/CountUp';
import PlateActionBar from '../../components/primitives/PlateActionBar';
import StatBlock from '../../components/primitives/StatBlock';

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="h-[88px] rounded-lg bg-secondary" />
      <div className="flex flex-wrap gap-[14px_28px]">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-16 min-w-[120px] flex-1 rounded bg-secondary" />
        ))}
      </div>
    </div>
  );
}

// ─── Página ──────────────────────────────────────────────────────────────────
// Tela 13 do redesign 2a. O AttentionCard âmbar (eram 3 cards) vira UMA
// placa — só o mais urgente (candidaturas pendentes). Os outros dois sinais
// de atenção (conteúdo a revisar, recompensas pendentes) descem pro Resumo
// como números normais, sem destaque — a hierarquia faz o trabalho que 3
// cards âmbar iguais não faziam.

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useDashboard();

  return (
    <div className="mx-auto max-w-5xl px-6 pt-[14px]">
      <h1 className="mb-7 font-display text-d-md text-foreground">Sua leitura</h1>

      {isError && (
        <p className="text-sm text-destructive">Erro ao carregar o dashboard. Tente novamente.</p>
      )}

      {isLoading && <Skeleton />}

      {!isLoading && !isError && data && (
        <>
          {data.campaigns.total === 0 ? (
            <>
              <p className="mb-3.5 text-xs text-[#75756E]">Comece por aqui</p>
              <Plate marks="top" flush className="max-w-[520px]">
                <div className="px-6 pb-6 pt-[26px]">
                  <p className="font-display text-[21px] font-bold tracking-[-.045em] text-plate-ink">
                    Nenhum programa ainda
                  </p>
                  <p className="mt-2.5 text-sm leading-[1.5] text-plate-body">
                    Crie o primeiro programa para começar a receber candidaturas de creators.
                  </p>
                </div>
                <PlateActionBar
                  primary={{
                    label: 'Criar o primeiro',
                    onClick: () => navigate('/brand/campaigns/new'),
                    icon: <ArrowRight size={16} />,
                  }}
                />
              </Plate>
            </>
          ) : (
            data.applications.pending > 0 && (
              <>
                <p className="mb-3.5 text-xs text-[#75756E]">Precisa de você</p>
                <Plate marks="top" flush className="max-w-[520px]">
                  <div className="px-6 pb-6 pt-[30px]">
                    <CountUp>
                      <span className="font-display text-d-hero text-plate-ink tabular-nums">
                        {data.applications.pending}
                      </span>
                    </CountUp>
                    <p className="mt-5 text-sm leading-[1.5] text-plate-dim">
                      candidatura{data.applications.pending !== 1 ? 's' : ''} esperando sua análise.
                    </p>
                  </div>
                  <PlateActionBar
                    primary={{
                      label: 'Analisar agora',
                      onClick: () => navigate('/brand/campaigns'),
                      icon: <ArrowRight size={16} />,
                    }}
                  />
                </Plate>
              </>
            )
          )}

          <h2 className="mb-[18px] mt-9 font-display text-d-xs text-foreground">Resumo</h2>
          <div className="flex flex-wrap gap-x-7 gap-y-3.5">
            <StatBlock
              label={`programas · ${data.campaigns.active} ativos`}
              value={data.campaigns.total}
              delay={120}
              className="min-w-[120px] py-0"
            />
            <StatBlock
              label={`candidaturas · ${data.applications.approved} fechadas`}
              value={data.applications.total}
              delay={240}
              className="min-w-[120px] py-0"
            />
            <StatBlock
              label="conteúdos a revisar"
              value={data.content.pendingReview}
              delay={360}
              className="min-w-[120px] py-0"
            />
            <StatBlock
              label={`recompensas · ${data.rewards.delivered} entregues`}
              value={data.rewards.total}
              delay={480}
              className="min-w-[120px] py-0"
            />
          </div>
        </>
      )}
    </div>
  );
}
