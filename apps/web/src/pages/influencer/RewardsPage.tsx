import { Trophy } from 'lucide-react';
import { useMyRewards } from '../../hooks/useMyRewards';
import type { RewardType } from '../../types/api';
import StatFigure from '../../components/primitives/kinetic/StatFigure';
import { creatorRewardStatusWord, formatDate } from '../../utils/format';
import { cn } from '../../lib/utils';

// ─── Página ───────────────────────────────────────────────────────────────────
// Migrada pro "Kinetic Editorial". Não tinha primitivo nenhum: era
// `rounded-xl border bg-card` em tudo, mais pills `bg-amber-500/10`.
//
// O rótulo de status vem do `creatorRewardStatusWord`, que é DIFERENTE do
// `rewardStatusWord` da marca de propósito — "A receber"/"A caminho" é a ótica
// de quem espera, "Pendente"/"Emitida" é a de quem paga. Por isso esta tela
// não usa o `StatusWord`: ele carrega o vocabulário da marca.

const REWARD_TYPE_LABEL: Record<RewardType, string> = {
  MONETARY: 'Pagamento',
  PRODUCT: 'Produto',
  DISCOUNT: 'Desconto',
};

function Skeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-24 animate-pulse border border-kinetic-gray bg-kinetic-dark" />
      ))}
    </div>
  );
}

export default function RewardsPage() {
  const { data: rewards = [], isLoading, isError } = useMyRewards();

  const pending = rewards.filter((r) => r.status === 'PENDING').length;
  const issued = rewards.filter((r) => r.status === 'ISSUED').length;
  const delivered = rewards.filter((r) => r.status === 'DELIVERED').length;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-12 pt-6 sm:px-6 lg:pt-10">
      <h1 className="font-display text-[42px] font-bold leading-[.9] tracking-[-.055em] text-foreground sm:text-[56px]">
        Recompensas
      </h1>
      <p className="mt-4 text-sm text-kinetic-muted">Tudo que você ganhou e tem a receber</p>

      <div className="my-8 h-px bg-kinetic-gray lg:my-10" />

      {!isLoading && !isError && rewards.length > 0 && (
        <div className="mb-11 grid grid-cols-3 gap-4">
          <StatFigure label="a receber" value={pending} highlight={pending > 0} />
          <StatFigure label="a caminho" value={issued} delay={120} />
          <StatFigure label="entregues" value={delivered} delay={240} />
        </div>
      )}

      {isLoading && <Skeleton />}

      {isError && <p className="text-sm text-destructive">Erro ao carregar. Tente novamente.</p>}

      {!isLoading && !isError && rewards.length === 0 && (
        <div className="border border-kinetic-gray px-5 py-12 text-center">
          <Trophy size={20} className="mx-auto mb-4 text-kinetic-muted" />
          <p className="font-display text-base font-semibold text-foreground">
            Nenhuma recompensa ainda
          </p>
          <p className="mt-2 text-xs text-kinetic-muted">
            Suas recompensas aparecem aqui após a marca registrá-las.
          </p>
        </div>
      )}

      {!isLoading && !isError && rewards.length > 0 && (
        <ul className="flex flex-col gap-0.5">
          {rewards.map((reward) => (
            <li
              key={reward.id}
              className="flex items-start justify-between gap-4 border border-kinetic-gray bg-kinetic-dark p-4 sm:p-5"
            >
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-widest text-kinetic-muted">
                  {reward.campaign.brand.name}
                </p>
                <p className="mt-2 truncate font-display text-base font-semibold tracking-[-.03em] text-foreground">
                  {reward.campaign.title}
                </p>

                <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-mono text-[10px] uppercase tracking-[.12em] text-kinetic-muted">
                    {REWARD_TYPE_LABEL[reward.type]}
                  </span>
                  <span className="break-all font-display text-lg font-bold tracking-[-.03em] text-lime">
                    {reward.value}
                  </span>
                </div>

                {reward.notes && (
                  <p className="mt-3 break-words text-xs leading-relaxed text-kinetic-muted">
                    {reward.notes}
                  </p>
                )}
                {reward.issuedAt && (
                  <p className="mt-2 text-xs text-kinetic-muted">
                    Emitido em {formatDate(reward.issuedAt)}
                  </p>
                )}
              </div>

              <span
                className={cn(
                  'shrink-0 font-mono text-[10px] uppercase tracking-widest',
                  reward.status === 'DELIVERED' ? 'text-kinetic-muted' : 'text-lime',
                )}
              >
                {creatorRewardStatusWord[reward.status]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
