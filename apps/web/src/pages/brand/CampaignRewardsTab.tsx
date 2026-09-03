import { useState } from 'react';
import { Gift, Plus, Banknote, Package, Tag, Truck, Trash2 } from 'lucide-react';
import axios from 'axios';
import type { CampaignReward, RewardStatus, RewardType } from '../../types/api';
import {
  useCampaignRewards,
  useCreateReward,
  useMarkRewardIssued,
  useMarkRewardDelivered,
  useDeleteReward,
  useApplications,
} from '../../hooks/useCampaignApplications';
import EmptyState from '../../components/primitives/EmptyState';
import KineticPlate from '../../components/primitives/kinetic/KineticPlate';
import KineticActions from '../../components/primitives/kinetic/KineticActions';
import StatusWord from '../../components/primitives/kinetic/StatusWord';
import { creatorAvatarSrc } from '../../utils/format';
import { cn } from '../../lib/utils';

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  RewardType,
  { label: string; icon: React.ReactNode; placeholder: string }
> = {
  MONETARY: { label: 'Monetária', icon: <Banknote size={13} />, placeholder: 'Ex: R$300,00' },
  PRODUCT: { label: 'Produto', icon: <Package size={13} />, placeholder: 'Ex: Kit Whey 900g' },
  DISCOUNT: {
    label: 'Desconto',
    icon: <Tag size={13} />,
    placeholder: 'Ex: Cupom AMANDA20 (20% off)',
  },
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
  error,
}: {
  campaignId: string;
  approvedCreators: { influencerId: string; name: string }[];
  onClose: () => void;
  onCreate: (data: {
    influencerId: string;
    campaignId: string;
    type: string;
    value: string;
    notes?: string;
  }) => void;
  isPending: boolean;
  error?: string | null;
}) {
  const [influencerId, setInfluencerId] = useState(approvedCreators[0]?.influencerId ?? '');
  const [type, setType] = useState<RewardType>('MONETARY');
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');

  const canSubmit = influencerId && value.trim();

  const fieldClasses =
    'w-full border-b border-[#b8b8b1] bg-transparent pb-2 text-sm text-black placeholder:text-[#8a8a84] focus:border-black focus:outline-none';
  const labelClasses = 'mb-2 block font-mono text-[10px] uppercase tracking-widest text-[#6a6a64]';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-4">
      <div className="w-full sm:max-w-md">
        <KineticPlate marks="top" flush className="rounded-b-none sm:rounded-b-lg">
          <div className="max-h-[70vh] overflow-y-auto px-6 pb-7 pt-11">
            <h3 className="font-display text-xl font-bold tracking-[-.04em] text-black">
              Registrar recompensa
            </h3>

            <div className="mt-7 space-y-6">
              <div>
                <label htmlFor="reward-creator" className={labelClasses}>
                  Creator
                </label>
                <select
                  id="reward-creator"
                  value={influencerId}
                  onChange={(e) => setInfluencerId(e.target.value)}
                  className={fieldClasses}
                >
                  {approvedCreators.map((c) => (
                    <option key={c.influencerId} value={c.influencerId}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className={labelClasses}>Tipo</span>
                {/* `flex-wrap` não é enfeite: em 360px os três blocos não cabem
                    numa linha e "Desconto" vazava pra fora do modal
                    (reportado 2026-08-27). */}
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(TYPE_CONFIG) as RewardType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={cn(
                        'flex min-h-[44px] items-center gap-2 border px-3 font-mono text-[10px] uppercase tracking-[.12em] transition-colors',
                        type === t
                          ? 'border-black bg-black text-[#e5e5e0]'
                          : 'border-[#b8b8b1] text-[#4a4a44] hover:border-black',
                      )}
                    >
                      {TYPE_CONFIG[t].icon}
                      {TYPE_CONFIG[t].label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="reward-value" className={labelClasses}>
                  Valor
                </label>
                <input
                  id="reward-value"
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  /* O placeholder sai do tipo escolhido — era um ternário que
                     mostrava exemplo de produto quando o tipo era desconto. */
                  placeholder={TYPE_CONFIG[type].placeholder}
                  className={fieldClasses}
                />
              </div>

              <div>
                <label htmlFor="reward-notes" className={labelClasses}>
                  Observações (opcional)
                </label>
                <textarea
                  id="reward-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Ex: Pix enviado em 15/06/2026"
                  className={cn(fieldClasses, 'resize-none')}
                />
              </div>
            </div>

            {error && <p className="mt-5 text-[13px] text-destructive">{error}</p>}
          </div>

          <KineticActions
            actions={[
              { label: 'Cancelar', onClick: onClose, width: 130 },
              {
                label: isPending ? 'Salvando…' : 'Registrar',
                onClick: () =>
                  canSubmit &&
                  onCreate({
                    influencerId,
                    campaignId,
                    type,
                    value: value.trim(),
                    notes: notes.trim() || undefined,
                  }),
                disabled: !canSubmit || isPending,
                primary: true,
              },
            ]}
          />
        </KineticPlate>
      </div>
    </div>
  );
}

// ─── Card de recompensa ───────────────────────────────────────────────────────

function RewardCard({
  reward,
  onIssue,
  onDeliver,
  onRemove,
  isIssueing,
  isDelivering,
}: {
  reward: CampaignReward;
  onIssue: () => void;
  onDeliver: () => void;
  onRemove: () => void;
  isIssueing: boolean;
  isDelivering: boolean;
}) {
  const typeCfg = TYPE_CONFIG[reward.type];

  return (
    <div className="flex flex-col gap-4 border border-kinetic-gray bg-kinetic-dark p-5">
      {/* Header: creator + status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {creatorAvatarSrc(reward.influencer) ? (
            <img
              src={creatorAvatarSrc(reward.influencer) as string}
              alt={reward.influencer.name}
              className="h-8 w-8 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-muted-foreground">
              {reward.influencer.name[0].toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{reward.influencer.name}</p>
            {reward.influencer.instagramHandle && (
              <p className="truncate text-xs text-muted-foreground">
                @{reward.influencer.instagramHandle}
              </p>
            )}
          </div>
        </div>
        <StatusWord kind="reward" status={reward.status} />
      </div>

      {/* Tipo + Valor */}
      <div className="flex items-end justify-between gap-3">
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-kinetic-muted">
          {typeCfg.icon}
          {typeCfg.label}
        </span>
        <span className="break-words text-right font-display text-lg font-bold tracking-[-.03em] text-foreground">
          {reward.value}
        </span>
      </div>

      {/* Observações */}
      {reward.notes && (
        <p className="break-words text-xs leading-relaxed text-kinetic-muted">{reward.notes}</p>
      )}

      {/* Ações */}
      {/* Remover só enquanto PENDING: a partir de ISSUED o pagamento/envio já
          foi anunciado à creator, e apagar reescreveria o histórico dela. */}
      {reward.status === 'PENDING' && (
        <div className="flex gap-2 border-t border-kinetic-gray pt-4">
          <button
            onClick={onIssue}
            disabled={isIssueing}
            className="flex min-h-[44px] flex-1 items-center justify-center gap-2 bg-lime px-3 font-mono text-[10px] font-medium uppercase tracking-widest text-black transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Truck size={13} />
            {isIssueing ? 'Processando…' : 'Marcar como emitida'}
          </button>
          <button
            onClick={onRemove}
            aria-label={`Remover recompensa de ${reward.influencer.name}`}
            className="flex min-h-[44px] w-11 shrink-0 items-center justify-center border border-kinetic-border text-kinetic-muted transition-colors hover:border-destructive hover:text-destructive"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}

      {reward.status === 'ISSUED' && (
        <div className="border-t border-kinetic-gray pt-4">
          <button
            onClick={onDeliver}
            disabled={isDelivering}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 bg-lime px-3 font-mono text-[10px] font-medium uppercase tracking-widest text-black transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Gift size={13} />
            {isDelivering ? 'Processando…' : 'Confirmar entrega'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Confirmação de remoção ───────────────────────────────────────────────────
// Diz a CONSEQUÊNCIA em vez de perguntar "tem certeza?" — mesmo padrão do
// WithdrawModal: a ação é definitiva e o efeito não é óbvio pra quem clica.

function RemoveRewardModal({
  reward,
  isPending,
  isError,
  onConfirm,
  onClose,
}: {
  reward: CampaignReward;
  isPending: boolean;
  isError: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="w-full sm:max-w-md">
        <KineticPlate marks="top" flush className="rounded-b-none sm:rounded-b-lg">
          <div className="px-6 pb-[26px] pt-[30px]">
            <p className="font-display text-xl font-bold tracking-[-.04em] text-black">
              Remover esta recompensa?
            </p>
            <p className="mt-3 text-[13px] leading-[1.5] text-[#6a6a64]">
              O registro de <span className="font-medium text-black">{reward.value}</span> para{' '}
              <span className="font-medium text-black">{reward.influencer.name}</span> some pra
              sempre, e some também da lista de recompensas dela. Não dá pra desfazer, mas você
              pode registrar de novo.
            </p>
            {isError && (
              <p className="mt-3 text-[13px] text-destructive">
                Não foi possível remover. Tente novamente.
              </p>
            )}
          </div>
          <KineticActions
            actions={[
              { label: 'Cancelar', onClick: onClose, width: 130 },
              {
                label: isPending ? 'Removendo…' : 'Remover',
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

// ─── Aba principal ────────────────────────────────────────────────────────────

export default function CampaignRewardsTab({ campaignId }: { campaignId: string }) {
  const [filter, setFilter] = useState<'ALL' | RewardStatus>('ALL');
  const [showCreate, setShowCreate] = useState(false);
  const [removing, setRemoving] = useState<CampaignReward | null>(null);

  const { data: rewards = [], isLoading } = useCampaignRewards(campaignId);
  const { data: applications = [] } = useApplications(campaignId);
  const create = useCreateReward(campaignId);
  const issue = useMarkRewardIssued(campaignId);
  const deliver = useMarkRewardDelivered(campaignId);
  const remove = useDeleteReward(campaignId);

  const approvedCreators = applications
    .filter((a) => a.status === 'APPROVED')
    .map((a) => ({ influencerId: a.influencerId, name: a.influencer.name }));

  const visible = filter === 'ALL' ? rewards : rewards.filter((r) => r.status === filter);

  if (isLoading) {
    return (
      <div className="mx-auto grid max-w-5xl gap-4 px-4 pb-12 sm:grid-cols-2 sm:px-6 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="animate-pulse space-y-4 border border-kinetic-gray bg-kinetic-dark p-5"
          >
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-kinetic-gray" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3 w-28 rounded bg-kinetic-gray" />
                <div className="h-2.5 w-20 rounded bg-kinetic-gray" />
              </div>
            </div>
            <div className="h-3 w-1/2 rounded bg-kinetic-gray" />
          </div>
        ))}
      </div>
    );
  }

  return (
    // Container próprio: desde a leva 2 o corpo do detalhe não dá mais padding
    // horizontal (cada aba dá o seu), e sem isto o conteúdo colava na sidebar e o
    // CTA "Registrar recompensa" saía cortado na borda direita.
    <div className="mx-auto max-w-5xl space-y-6 px-4 pb-32 sm:px-6 md:pb-12">
      {/* Header com botão de criação */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={cn(
                'border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[.12em] transition-colors',
                filter === value
                  ? 'border-lime text-lime'
                  : 'border-kinetic-gray text-kinetic-muted hover:text-foreground',
              )}
            >
              {label}
              {value === 'ALL' && (
                <span className="ml-2 tabular-nums text-kinetic-muted">{rewards.length}</span>
              )}
            </button>
          ))}
        </div>

        {approvedCreators.length > 0 && (
          <button
            onClick={() => setShowCreate(true)}
            /* No celular os filtros já ocupam duas linhas e o CTA caía numa
               terceira, parecendo mais um chip do grupo. Vira barra fixa no
               rodapé, 10px acima da tab bar do BrandLayout (que mede 4rem + safe
               area) — colada nela parecia parte da navegação,
               que é onde a ação primária fica ao alcance do polegar. A partir
               de `md` some a tab bar e ele volta a ser o contorno compacto à
               direita dos filtros. */
            style={{ bottom: 'calc(4rem + 0.625rem + env(safe-area-inset-bottom))' }}
            className="fixed inset-x-4 z-30 flex min-h-[52px] items-center justify-center gap-2 bg-lime px-4 font-mono text-[11px] font-medium uppercase tracking-widest text-black shadow-[0_8px_24px_-8px_rgba(0,0,0,.9)] transition-colors hover:bg-white md:static md:inset-auto md:min-h-[38px] md:w-auto md:shrink-0 md:border md:border-lime md:bg-transparent md:text-[10px] md:text-lime md:shadow-none md:hover:bg-lime md:hover:text-black"
          >
            <Plus size={12} />
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
              ? 'Registre as recompensas das candidaturas aprovadas nessa campanha.'
              : filter === 'ALL'
                ? 'Recompensas ficam disponíveis quando houver candidatura aprovada.'
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
              onRemove={() => setRemoving(reward)}
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
          error={
            create.error && axios.isAxiosError(create.error)
              ? ((create.error.response?.data?.message as string | undefined) ??
                'Erro ao registrar recompensa.')
              : null
          }
          onCreate={(data) => {
            create.mutate(data, { onSuccess: () => setShowCreate(false) });
          }}
          onClose={() => setShowCreate(false)}
        />
      )}

      {/* Confirmação de remoção — fica aberta no erro, pra dar retry */}
      {removing && (
        <RemoveRewardModal
          reward={removing}
          isPending={remove.isPending}
          isError={remove.isError}
          onConfirm={() => remove.mutate(removing.id, { onSuccess: () => setRemoving(null) })}
          onClose={() => {
            remove.reset();
            setRemoving(null);
          }}
        />
      )}
    </div>
  );
}
