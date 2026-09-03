import { useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import axios from 'axios';
import type {
  CampaignPartnership,
  PartnershipResult,
  PartnershipResultPayload,
} from '../../types/api';
import {
  useCampaignPartnerships,
  useCreatePartnershipResult,
  useUpdatePartnershipResult,
  useDeletePartnershipResult,
} from '../../hooks/usePartnershipResults';
import EmptyState from '../../components/primitives/EmptyState';
import KineticPlate from '../../components/primitives/kinetic/KineticPlate';
import KineticActions from '../../components/primitives/kinetic/KineticActions';
import KineticRow from '../../components/primitives/kinetic/KineticRow';
import KineticFact from '../../components/primitives/kinetic/KineticFact';
import KineticToggle from '../../components/primitives/kinetic/KineticToggle';
import StatFigure from '../../components/primitives/kinetic/StatFigure';
import StatusWord from '../../components/primitives/kinetic/StatusWord';
import { creatorAvatarSrc, formatDate, formatNumberParts } from '../../utils/format';
import { cn } from '../../lib/utils';

// ─── Aba Resultado ───────────────────────────────────────────────────────────
// Fecha os diferenciais nº 2 (histórico verificado) e nº 3 (transparência
// bilateral): é aqui que a marca devolve à creator o que a parceria deu.
//
// Adota o par lista + placa de Entregas e da Fila. A lista mostra TODA parceria
// aprovada — inclusive as sem resultado, que são justamente o trabalho a fazer.
//
// O que esta tela NÃO faz, de propósito: não mede nada. Os números são
// digitados pela marca e toda superfície que os mostra diz isso
// (`vision.md` nº 5 — nada de métrica de reputação que a gente não prove).

const FILTERS: { value: 'ALL' | 'PENDING' | 'REGISTERED'; label: string }[] = [
  { value: 'ALL', label: 'Todas' },
  { value: 'PENDING', label: 'A informar' },
  { value: 'REGISTERED', label: 'Informadas' },
];

const METRICS = [
  { key: 'reach', label: 'Alcance', placeholder: 'Ex: 12400' },
  { key: 'impressions', label: 'Impressões', placeholder: 'Ex: 18900' },
  { key: 'couponsUsed', label: 'Cupons usados', placeholder: 'Ex: 37' },
] as const;

type MetricKey = (typeof METRICS)[number]['key'];

/** Campo numérico vazio é ausência de informação (null), não zero. */
function parseMetric(raw: string): number | null {
  const digits = raw.replace(/\D/g, '');
  return digits === '' ? null : Number(digits);
}

// Mensagem da API (ex: o 409 de resultado já registrado) em vez de um erro
// genérico — aquele 409 diz o que fazer ("edite o que existe"), e engoli-lo
// deixaria a marca sem saída na tela.
function extractSaveError(error: unknown): string | null {
  if (!error) return null;
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? 'Não foi possível salvar o resultado.';
  }
  return 'Não foi possível salvar o resultado.';
}

// ─── Modal de registro/edição ────────────────────────────────────────────────

function ResultModal({
  partnership,
  onClose,
  onSave,
  isPending,
  error,
}: {
  partnership: CampaignPartnership;
  onClose: () => void;
  onSave: (payload: PartnershipResultPayload) => void;
  isPending: boolean;
  error?: string | null;
}) {
  const existing = partnership.result;
  const [values, setValues] = useState<Record<MetricKey, string>>({
    reach: existing?.reach?.toString() ?? '',
    impressions: existing?.impressions?.toString() ?? '',
    couponsUsed: existing?.couponsUsed?.toString() ?? '',
  });
  const [note, setNote] = useState(existing?.note ?? '');
  const [allowPublic, setAllowPublic] = useState(
    existing?.brandAllowsPublic ?? false,
  );

  // Mesma regra da API: registro sem número nem observação não é resultado.
  const canSubmit =
    METRICS.some(({ key }) => parseMetric(values[key]) !== null) ||
    note.trim().length > 0;

  const fieldClasses =
    'w-full border-b border-[#b8b8b1] bg-transparent pb-2 text-sm text-black placeholder:text-[#8a8a84] focus:border-black focus:outline-none';
  const labelClasses =
    'mb-2 block font-mono text-[10px] uppercase tracking-widest text-[#6a6a64]';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={existing ? 'Editar resultado' : 'Informar resultado'}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-4"
    >
      <div className="w-full sm:max-w-md">
        <KineticPlate marks="top" flush className="rounded-b-none sm:rounded-b-lg">
          <div className="max-h-[75vh] overflow-y-auto px-6 pb-7 pt-11">
            <h3 className="font-display text-xl font-bold tracking-[-.04em] text-black">
              {existing ? 'Editar resultado' : 'Informar resultado'}
            </h3>
            <p className="mt-2 text-[13px] leading-[1.5] text-[#6a6a64]">
              A parceria com{' '}
              <span className="font-medium text-black">
                {partnership.influencer.name}
              </span>
              . Informe só o que você tem. Nada aqui é obrigatório
              individualmente.
            </p>

            <div className="mt-7 space-y-6">
              {/* Flex-wrap e campos de largura mínima: três números lado a
                  lado não caberiam em 360px. */}
              <div className="flex flex-wrap gap-x-5 gap-y-6">
                {METRICS.map(({ key, label, placeholder }) => (
                  <div key={key} className="min-w-[120px] flex-1">
                    <label htmlFor={`result-${key}`} className={labelClasses}>
                      {label}
                    </label>
                    <input
                      id={`result-${key}`}
                      type="text"
                      inputMode="numeric"
                      value={values[key]}
                      onChange={(e) =>
                        setValues((v) => ({
                          ...v,
                          [key]: e.target.value.replace(/\D/g, ''),
                        }))
                      }
                      placeholder={placeholder}
                      className={cn(fieldClasses, 'tabular-nums')}
                    />
                  </div>
                ))}
              </div>

              <div>
                <label htmlFor="result-note" className={labelClasses}>
                  Observação (opcional)
                </label>
                <textarea
                  id="result-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder="Ex: Melhor entrega da campanha. Vamos repetir no próximo drop."
                  className={cn(fieldClasses, 'resize-none')}
                />
                <p className="mt-2 text-[11px] leading-[1.5] text-[#7a7a74]">
                  Ela vê esta observação. Escreva pra ela.
                </p>
              </div>

              {/* O consentimento de PUBLICAR é separado de registrar: /c/:handle
                  é página aberta e indexável, e alcance/cupons são dado
                  comercial da marca. Nasce desligado (D-21). */}
              <div className="flex items-start justify-between gap-4 border-t border-[#c9c9c3] pt-6">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-black">
                    Pode aparecer no perfil público dela
                  </p>
                  <p className="mt-1.5 text-[12px] leading-[1.5] text-[#6a6a64]">
                    {allowPublic
                      ? 'Os números e sua observação vão aparecer no perfil público dela, com o nome da sua marca ao lado.'
                      : 'Desligado, o resultado fica só entre vocês duas: ela vê, o público não.'}
                  </p>
                </div>
                <KineticToggle
                  tone="plate"
                  checked={allowPublic}
                  onChange={setAllowPublic}
                  label="Pode aparecer no perfil público dela"
                />
              </div>
            </div>

            {error && <p className="mt-5 text-[13px] text-destructive">{error}</p>}
          </div>

          <KineticActions
            actions={[
              { label: 'Cancelar', onClick: onClose, width: 130 },
              {
                label: isPending ? 'Salvando…' : 'Salvar',
                onClick: () =>
                  canSubmit &&
                  onSave({
                    reach: parseMetric(values.reach),
                    impressions: parseMetric(values.impressions),
                    couponsUsed: parseMetric(values.couponsUsed),
                    note: note.trim() || null,
                    brandAllowsPublic: allowPublic,
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

// ─── Confirmação de remoção ──────────────────────────────────────────────────
// Diz a CONSEQUÊNCIA, no padrão do WithdrawModal e do RemoveRewardModal: aqui
// ela é maior que nos outros dois, porque a creator já foi avisada por e-mail
// e o resultado já pode estar no perfil público dela.

function RemoveResultModal({
  partnership,
  isPending,
  isError,
  onConfirm,
  onClose,
}: {
  partnership: CampaignPartnership;
  isPending: boolean;
  isError: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const wasPublic = partnership.result?.brandAllowsPublic;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Apagar este resultado?"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center"
    >
      <div className="w-full sm:max-w-md">
        <KineticPlate marks="top" flush className="rounded-b-none sm:rounded-b-lg">
          <div className="px-6 pb-[26px] pt-[30px]">
            <p className="font-display text-xl font-bold tracking-[-.04em] text-black">
              Apagar este resultado?
            </p>
            <p className="mt-3 text-[13px] leading-[1.5] text-[#6a6a64]">
              O resultado da parceria com{' '}
              <span className="font-medium text-black">
                {partnership.influencer.name}
              </span>{' '}
              sai do registro dela
              {wasPublic ? ' e do perfil público dela' : ''}, e a parceria volta
              a contar como não informada. Ela já foi avisada de que você
              registrou. Corrigir os números editando é menos confuso pra ela
              do que apagar.
            </p>
            {isError && (
              <p className="mt-3 text-[13px] text-destructive">
                Não foi possível apagar. Tente novamente.
              </p>
            )}
          </div>
          <KineticActions
            actions={[
              { label: 'Cancelar', onClick: onClose, disabled: isPending, width: 130 },
              {
                label: isPending ? 'Apagando…' : 'Apagar',
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

// ─── Placa: a parceria selecionada ───────────────────────────────────────────

function Metric({ label, value }: { label: string; value: number }) {
  const { value: figure, suffix } = formatNumberParts(value);
  return (
    <StatFigure
      tone="plate"
      label={label}
      value={
        <>
          {figure}
          {suffix && <span className="text-[20px]">{suffix}</span>}
        </>
      }
    />
  );
}

function PartnershipPlate({
  partnership,
  onRegister,
  onEdit,
  onRemove,
}: {
  partnership: CampaignPartnership;
  onRegister: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { influencer, result } = partnership;
  const avatarSrc = creatorAvatarSrc(influencer);
  const metrics = result
    ? METRICS.filter(({ key }) => result[key] !== null)
    : [];

  return (
    <KineticPlate as="section" marks="all" flush>
      <div className="px-6 pb-8 pt-11 sm:px-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={influencer.name}
                className="h-14 w-14 shrink-0 rounded object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-[#cfcfc8] font-display text-lg font-bold text-[#6a6a64]">
                {influencer.name[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate font-display text-xl font-bold tracking-[-.04em] text-black">
                {influencer.name}
              </p>
              {influencer.instagramHandle && (
                <p className="mt-1 truncate font-mono text-[13px] text-[#6a6a64]">
                  @{influencer.instagramHandle}
                </p>
              )}
            </div>
          </div>
          <span className="shrink-0 font-mono text-[11px] uppercase tracking-widest text-[#6a6a64]">
            {result ? 'Informado' : 'A informar'}
          </span>
        </div>

        <div className="my-7 h-px bg-[#c9c9c3]" />

        {!result && (
          <p className="text-sm leading-[1.55] text-[#3a3a34]">
            Você ainda não informou o que esta parceria deu. É o que transforma
            a candidatura aprovada em histórico, e é a única forma de a creator
            saber o resultado do trabalho dela.
          </p>
        )}

        {result && (
          <>
            {metrics.length > 0 && (
              <div className="flex flex-wrap gap-x-10 gap-y-7">
                {metrics.map(({ key, label }) => (
                  <Metric key={key} label={label} value={result[key] as number} />
                ))}
              </div>
            )}

            {result.note && (
              <div
                className={cn(
                  'border-l-2 border-[#b8b8b1] pl-4',
                  metrics.length > 0 && 'mt-8',
                )}
              >
                <p className="whitespace-pre-line break-words text-sm leading-relaxed text-[#3a3a34]">
                  {result.note}
                </p>
              </div>
            )}

            {/* A régua de honestidade, na placa e não só no cabeçalho: quem lê
                esta placa tem que saber que o número foi digitado, não medido. */}
            <p className="mt-8 font-mono text-[10px] uppercase tracking-widest text-[#7a7a74]">
              Informado por você em {formatDate(result.createdAt, '—')}
            </p>

            <div className="mt-6">
              <KineticFact
                tone="plate"
                label="No perfil público dela"
                value={
                  result.brandAllowsPublic
                    ? result.hiddenByCreator
                      ? 'Liberado por você, mas ela escolheu não mostrar'
                      : 'Aparece, com o nome da sua marca'
                    : 'Não aparece. Só ela vê'
                }
              />
            </div>
          </>
        )}
      </div>

      {result ? (
        <KineticActions
          actions={[
            { label: 'Editar', onClick: onEdit, primary: true },
            { label: 'Apagar', onClick: onRemove },
          ]}
        />
      ) : (
        <KineticActions
          actions={[
            { label: 'Informar resultado', onClick: onRegister, primary: true },
          ]}
        />
      )}
    </KineticPlate>
  );
}

// ─── Aba ─────────────────────────────────────────────────────────────────────

export default function CampaignResultsTab({ campaignId }: { campaignId: string }) {
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'REGISTERED'>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<CampaignPartnership | null>(null);
  const [removing, setRemoving] = useState<CampaignPartnership | null>(null);

  const { data: partnerships = [], isLoading } = useCampaignPartnerships(campaignId);
  const create = useCreatePartnershipResult(campaignId);
  const update = useUpdatePartnershipResult(campaignId);
  const remove = useDeletePartnershipResult(campaignId);

  const visible = useMemo(
    () =>
      filter === 'ALL'
        ? partnerships
        : partnerships.filter((p) =>
            filter === 'REGISTERED' ? p.result !== null : p.result === null,
          ),
    [partnerships, filter],
  );

  // A seleção segue a lista filtrada (mesma regra de Entregas): se a parceria
  // aberta sai do filtro — e ela SAI, porque informar o resultado a move de
  // "a informar" pra "informadas" — a placa passa pra primeira que restou.
  const selected = visible.find((p) => p.applicationId === selectedId) ?? visible[0] ?? null;

  const pendingCount = partnerships.filter((p) => p.result === null).length;

  const saveError = extractSaveError(create.error ?? update.error);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl animate-pulse px-4 pb-12 sm:px-6">
        <div className="h-8 w-64 rounded bg-kinetic-dark" />
        <div className="mt-8 flex flex-col gap-8 lg:flex-row">
          <div className="h-[360px] flex-1 rounded-lg bg-kinetic-dark" />
          <div className="w-full space-y-2 lg:w-[340px]">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 rounded bg-kinetic-dark" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-12 sm:px-6">
      {/* Grupo nomeado: a linha da lista (`KineticRow`) é um botão cujo nome
          acessível inclui o status ("A informar"), então sem isto o filtro e a
          linha ficam indistinguíveis pra quem navega por leitor de tela — e
          pro teste. */}
      <div role="group" aria-label="Filtrar parcerias" className="flex flex-wrap gap-2">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
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
              <span className="ml-2 tabular-nums text-kinetic-muted">
                {partnerships.length}
              </span>
            )}
            {value === 'PENDING' && pendingCount > 0 && (
              <span className="ml-2 tabular-nums text-kinetic-muted">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {partnerships.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={<BarChart3 size={20} />}
            title="Nenhuma parceria aprovada ainda"
            description="Resultado existe depois de aprovar uma candidatura na Fila."
          />
        </div>
      ) : visible.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={<BarChart3 size={20} />}
            title={
              filter === 'PENDING'
                ? 'Todas as parcerias já têm resultado informado'
                : 'Nenhum resultado informado ainda'
            }
          />
        </div>
      ) : (
        <>
          <p className="mt-6 text-[13px] leading-[1.55] text-kinetic-muted">
            Os números são informados por você. O tayro não mede alcance. Eles
            aparecem pra creator sempre, e no perfil público dela só se você
            liberar.
          </p>

          <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start">
            {/* Lista antes da placa no DOM: no celular tocar numa linha
                atualiza uma placa que já está à vista. */}
            <aside className="w-full lg:order-2 lg:w-[340px] lg:shrink-0">
              <p className="mb-5 font-mono text-[11px] uppercase tracking-widest text-kinetic-muted">
                Parcerias · {visible.length}
              </p>
              <ul aria-label="Parcerias" className="flex flex-col gap-0.5">
                {visible.map((p) => {
                  const rowAvatar = creatorAvatarSrc(p.influencer);
                  return (
                    <li key={p.applicationId}>
                      <KineticRow
                        title={p.influencer.name}
                        meta={
                          p.influencer.instagramHandle
                            ? `@${p.influencer.instagramHandle}`
                            : undefined
                        }
                        selected={selected?.applicationId === p.applicationId}
                        onClick={() => setSelectedId(p.applicationId)}
                        leading={
                          <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-kinetic-gray">
                            {rowAvatar && (
                              <img src={rowAvatar} alt="" className="h-full w-full object-cover" />
                            )}
                          </span>
                        }
                        trailing={
                          <StatusWord
                            kind="partnershipResult"
                            status={p.result ? 'REGISTERED' : 'PENDING'}
                          />
                        }
                      />
                    </li>
                  );
                })}
              </ul>
            </aside>

            <div className="min-w-0 flex-1 lg:order-1">
              {selected && (
                <PartnershipPlate
                  partnership={selected}
                  onRegister={() => setEditing(selected)}
                  onEdit={() => setEditing(selected)}
                  onRemove={() => setRemoving(selected)}
                />
              )}
            </div>
          </div>
        </>
      )}

      {editing && (
        <ResultModal
          partnership={editing}
          isPending={create.isPending || update.isPending}
          error={saveError}
          onSave={(payload) => {
            const existing: PartnershipResult | null = editing.result;
            if (existing) {
              update.mutate(
                { id: existing.id, ...payload },
                { onSuccess: () => setEditing(null) },
              );
            } else {
              create.mutate(
                { applicationId: editing.applicationId, ...payload },
                { onSuccess: () => setEditing(null) },
              );
            }
          }}
          onClose={() => {
            create.reset();
            update.reset();
            setEditing(null);
          }}
        />
      )}

      {/* Fica aberta no erro, pra dar retry — mesmo padrão dos outros modais. */}
      {removing?.result && (
        <RemoveResultModal
          partnership={removing}
          isPending={remove.isPending}
          isError={remove.isError}
          onConfirm={() =>
            remove.mutate(removing.result!.id, {
              onSuccess: () => setRemoving(null),
            })
          }
          onClose={() => {
            remove.reset();
            setRemoving(null);
          }}
        />
      )}
    </div>
  );
}
