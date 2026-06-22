import { Trophy } from 'lucide-react';
import { useMyRewards } from '../../hooks/useMyRewards';
import type { RewardStatus, RewardType } from '../../types/api';
import { formatDate } from '../../utils/format';
import { cn } from '../../lib/utils';

// ─── Mapas de exibição ────────────────────────────────────────────────────────

const REWARD_STATUS: Record<RewardStatus, { label: string; cls: string }> = {
  PENDING:   { label: 'A receber', cls: 'bg-amber-500/10 text-amber-400' },
  ISSUED:    { label: 'A caminho', cls: 'bg-blue-500/10 text-blue-400' },
  DELIVERED: { label: 'Entregue',  cls: 'bg-lime/10 text-lime' },
};

const REWARD_TYPE_LABEL: Record<RewardType, string> = {
  MONETARY: 'Pagamento',
  PRODUCT:  'Produto',
  DISCOUNT: 'Desconto',
};

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-card" />
      ))}
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function RewardsPage() {
  const { data: rewards = [], isLoading, isError } = useMyRewards();

  const pending   = rewards.filter((r) => r.status === 'PENDING').length;
  const issued    = rewards.filter((r) => r.status === 'ISSUED').length;
  const delivered = rewards.filter((r) => r.status === 'DELIVERED').length;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6">
        <h1 className="font-display text-xl font-bold sm:text-2xl">Minhas recompensas</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Tudo que você ganhou e tem a receber
        </p>
      </div>

      {/* Stats */}
      {!isLoading && !isError && rewards.length > 0 && (
        <div className="mb-6 flex gap-3">
          {(
            [
              { value: pending,   label: 'a receber' },
              { value: issued,    label: 'a caminho' },
              { value: delivered, label: 'entregues' },
            ] as const
          ).map(({ value, label }) => (
            <div
              key={label}
              className="flex-1 rounded-xl border border-border bg-card p-4 text-center"
            >
              <p className="font-display text-2xl font-bold tabular-nums">{value}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      )}

      {isLoading && <Skeleton />}

      {isError && (
        <p className="text-sm text-destructive">Erro ao carregar. Tente novamente.</p>
      )}

      {!isLoading && !isError && rewards.length === 0 && (
        <div className="rounded-xl border border-border bg-card px-5 py-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
            <Trophy size={20} className="text-muted-foreground" />
          </div>
          <p className="font-display text-sm font-semibold">Nenhuma recompensa ainda</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Suas recompensas aparecem aqui após a marca registrá-las.
          </p>
        </div>
      )}

      {!isLoading && !isError && rewards.length > 0 && (
        <ul className="space-y-3">
          {rewards.map((reward) => {
            const { label, cls } = REWARD_STATUS[reward.status];
            return (
              <li
                key={reward.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-4"
              >
                <div className="min-w-0 space-y-1">
                  <p className="text-xs text-muted-foreground">
                    {reward.campaign.brand.name}
                  </p>
                  <p className="truncate text-sm font-medium">{reward.campaign.title}</p>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                      {REWARD_TYPE_LABEL[reward.type]}
                    </span>
                    <span className="text-sm font-semibold text-lime">{reward.value}</span>
                  </div>
                  {reward.notes && (
                    <p className="text-xs text-muted-foreground">{reward.notes}</p>
                  )}
                  {reward.issuedAt && (
                    <p className="text-xs text-muted-foreground">
                      Emitido em {formatDate(reward.issuedAt)}
                    </p>
                  )}
                </div>
                <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium', cls)}>
                  {label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
