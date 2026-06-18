import { useState } from 'react';
import { Gift, Plus, Banknote, Package, Tag, Truck } from 'lucide-react';
import type { CampaignReward, RewardStatus, RewardType } from '../../types/api';
import {
  useCampaignRewards,
  useCreateReward,
  useMarkRewardIssued,
  useMarkRewardDelivered,
  useApplications,
} from '../../hooks/useCampaignApplications';
import EmptyState from '../../components/primitives/EmptyState';
import { cn } from '../../lib/utils';

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<RewardStatus, { label: string; className: string }> = {
  PENDING: { label: 'Pendente', className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  ISSUED: { label: 'Emitida', className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  DELIVERED: { label: 'Entregue', className: 'bg-lime/10 text-lime border-lime/20' },
};

const TYPE_CONFIG: Record<RewardType, { label: string; icon: React.ReactNode }> = {
  MONETARY: { label: 'Monetária', icon: <Banknote size={13} /> },
  PRODUCT: { label: 'Produto', icon: <Package size={13} /> },
  DISCOUNT: { label: 'Desconto', icon: <Tag size={13} /> },
};

const FILTERS: { value: 'ALL' | RewardStatus; label: string }[] = [
  { value: 'ALL', label: 'Todas' },
  { value: 'PENDING', label: 'Pendente' },
  { value: 'ISSUED', label: 'Emitida' },
  { value: 'DELIVERED', label: 'Entregue' },
];

// ─── Modal de criação ─────────────────────────────────────────────────────────

function CreateRewardModal({
  campaignId,
  approvedCreators,
  onClose,
  onCreate,
  isPending,
}: {
  campaignId: string;
  approvedCreators: { influencerId: string; name: string }[];
  onClose: () => void;
  onCreate: (data: { influencerId: string; campaignId: string; type: string; value: string; notes?: string }) => void;
  isPending: boolean;
}) {
  const [influencerId, setInfluencerId] = useState(approvedCreators[0]?.influencerId ?? '');
  const [type, setType] = useState<RewardType>('MONETARY');
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');

  const canSubmit = influencerId && value.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
        <h3 className="mb-4 font-display text-sm font-semibold text-foreground">
          Registrar recompensa
        </h3>

        <div className="space-y-4">
          {/* Creator */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Creator
            </label>
            <select
              value={influencerId}
              onChange={(e) => setInfluencerId(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-lime focus:outline-none"
            >
              {approvedCreators.map((c) => (
                <option key={c.influencerId} value={c.influencerId}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Tipo
            </label>
            <div className="flex gap-2">
              {(Object.keys(TYPE_CONFIG) as RewardType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                    type === t
                      ? 'border-lime/30 bg-lime/10 text-lime'
                      : 'border-border text-muted-foreground hover:text-foreground',
                  )}
                >
                  {TYPE_CONFIG[t].icon}
                  {TYPE_CONFIG[t].label}
                </button>
              ))}
            </div>
          </div>

          {/* Valor */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Valor
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={type === 'MONETARY' ? 'Ex: R$300,00' : 'Ex: Kit Whey 900g'}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-lime focus:outline-none"
            />
          </div>

          {/* Observações */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Observações <span className="text-muted-foreground/60">(opcional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Ex: Pix enviado em 15/06/2026"
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-lime focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Cancelar
          </button>
          <button
            onClick={() =>
              canSubmit &&
              onCreate({
                influencerId,
                campaignId,
                type,
                value: value.trim(),
                notes: notes.trim() || undefined,
              })
            }
            disabled={!canSubmit || isPending}
            className="rounded-lg bg-lime px-4 py-2 text-xs font-semibold text-background disabled:opacity-50 hover:bg-lime/90"
          >
            {isPending ? 'Salvando...' : 'Registrar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Card de recompensa ───────────────────────────────────────────────────────

function RewardCard({
  reward,
  onIssue,
  onDeliver,
  isIssueing,
  isDelivering,
}: {
  reward: CampaignReward;
  onIssue: () => void;
  onDeliver: () => void;
  isIssueing: boolean;
  isDelivering: boolean;
}) {
  const statusCfg = STATUS_CONFIG[reward.status];
  const typeCfg = TYPE_CONFIG[reward.type];

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      {/* Header: creator + status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {reward.influencer.avatarUrl ? (
            <img
              src={reward.influencer.avatarUrl}
              alt={reward.influencer.name}
              className="h-8 w-8 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-muted-foreground">
              {reward.influencer.name[0].toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {reward.influencer.name}
            </p>
            {reward.influencer.instagramHandle && (
              <p className="truncate text-xs text-muted-foreground">
                @{reward.influencer.instagramHandle}
              </p>
            )}
          </div>
        </div>
        <span
          className={cn(
            'shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
            statusCfg.className,
          )}
        >
          {statusCfg.label}
        </span>
      </div>

      {/* Tipo + Valor */}
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          {typeCfg.icon}
          {typeCfg.label}
        </span>
        <span className="font-semibold text-foreground">{reward.value}</span>
      </div>

      {/* Observações */}
      {reward.notes && (
        <p className="text-xs leading-relaxed text-muted-foreground">{reward.notes}</p>
      )}

      {/* Ações */}
      {reward.status === 'PENDING' && (
        <div className="border-t border-border pt-3">
          <button
            onClick={onIssue}
            disabled={isIssueing}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-500/10 px-3 py-2 text-xs font-medium text-blue-400 hover:bg-blue-500/20 disabled:opacity-50 transition-colors"
          >
            <Truck size={13} />
            {isIssueing ? 'Processando...' : 'Marcar como emitida'}
          </button>
        </div>
      )}

      {reward.status === 'ISSUED' && (
        <div className="border-t border-border pt-3">
          <button
            onClick={onDeliver}
            disabled={isDelivering}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-lime/10 px-3 py-2 text-xs font-medium text-lime hover:bg-lime/20 disabled:opacity-50 transition-colors"
          >
            <Gift size={13} />
            {isDelivering ? 'Processando...' : 'Confirmar entrega'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Aba principal ────────────────────────────────────────────────────────────

export default function CampaignRewardsTab({ campaignId }: { campaignId: string }) {
  const [filter, setFilter] = useState<'ALL' | RewardStatus>('ALL');
  const [showCreate, setShowCreate] = useState(false);

  const { data: rewards = [], isLoading } = useCampaignRewards(campaignId);
  const { data: applications = [] } = useApplications(campaignId);
  const create = useCreateReward(campaignId);
  const issue = useMarkRewardIssued(campaignId);
  const deliver = useMarkRewardDelivered(campaignId);

  const approvedCreators = applications
    .filter((a) => a.status === 'APPROVED')
    .map((a) => ({ influencerId: a.influencerId, name: a.influencer.name }));

  const visible = filter === 'ALL' ? rewards : rewards.filter((r) => r.status === filter);

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-border bg-card p-5 space-y-4"
          >
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-secondary" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3 w-28 rounded bg-secondary" />
                <div className="h-2.5 w-20 rounded bg-secondary" />
              </div>
            </div>
            <div className="h-3 w-1/2 rounded bg-secondary" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header com botão de criação */}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                filter === value
                  ? 'border-lime/30 bg-lime/10 text-lime'
                  : 'border-border text-muted-foreground hover:border-border/80 hover:text-foreground',
              )}
            >
              {label}
              {value === 'ALL' && (
                <span className="ml-1.5 tabular-nums text-muted-foreground">
                  {rewards.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {approvedCreators.length > 0 && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 rounded-lg bg-lime px-3 py-1.5 text-xs font-semibold text-background hover:bg-lime/90 transition-colors"
          >
            <Plus size={13} />
            Registrar recompensa
          </button>
        )}
      </div>

      {/* Lista ou empty state */}
      {visible.length === 0 ? (
        <EmptyState
          icon={<Gift size={20} />}
          title={
            filter === 'ALL'
              ? 'Nenhuma recompensa registrada'
              : 'Nenhuma recompensa com esse status'
          }
          description={
            filter === 'ALL' && approvedCreators.length > 0
              ? 'Registre as recompensas para as creators aprovadas nessa campanha.'
              : filter === 'ALL'
              ? 'Recompensas ficam disponíveis quando houver creators aprovadas.'
              : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((reward) => (
            <RewardCard
              key={reward.id}
              reward={reward}
              onIssue={() => issue.mutate(reward.id)}
              onDeliver={() => deliver.mutate(reward.id)}
              isIssueing={issue.isPending && issue.variables === reward.id}
              isDelivering={deliver.isPending && deliver.variables === reward.id}
            />
          ))}
        </div>
      )}

      {/* Modal de criação */}
      {showCreate && (
        <CreateRewardModal
          campaignId={campaignId}
          approvedCreators={approvedCreators}
          isPending={create.isPending}
          onCreate={(data) => {
            create.mutate(data, { onSuccess: () => setShowCreate(false) });
          }}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
