import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { CreateCampaignPayload } from '../../hooks/useCampaigns';
import {
  campaignFormSchema,
  formValuesToPayload,
  type CampaignFormValues,
} from './campaignFormSchema';
import { formatCurrency } from '../../utils/format';
import { cn } from '../../lib/utils';
import Plate from '../../components/primitives/Plate';
import CountUp from '../../components/primitives/CountUp';
import PlateField from '../../components/primitives/PlateField';
import PlateTextarea from '../../components/primitives/PlateTextarea';
import NicheSelector from '../../components/primitives/NicheSelector';

// Formulário do programa, compartilhado por "Novo programa" e "Editar
// programa". Extraído do NewCampaignPage quando a edição ganhou tela —
// duplicar ~200 linhas de form + prévia era garantia de os dois divergirem na
// primeira mudança de campo.

// ─── Segmentado CASH/PRODUCT — trilha transparente, ativo bg-plate ──────────

function OfferTypeToggle({
  value,
  onChange,
}: {
  value: 'CASH' | 'PRODUCT' | 'COMMISSION';
  onChange: (v: 'CASH' | 'PRODUCT' | 'COMMISSION') => void;
}) {
  return (
    <div className="mb-6 flex gap-1.5">
      {(['CASH', 'PRODUCT', 'COMMISSION'] as const).map((type) => (
        <button
          key={type}
          type="button"
          onClick={() => onChange(type)}
          className={cn(
            'rounded-md px-[14px] py-[9px] font-display text-[13px] font-semibold tracking-[-.02em] transition-colors',
            value === type ? 'bg-plate text-[#0A0A0A]' : 'text-[#75756E] hover:text-foreground',
          )}
        >
          {type === 'CASH' ? 'Dinheiro (PIX)' : type === 'PRODUCT' ? 'Produto' : 'Comissão'}
        </button>
      ))}
    </div>
  );
}

// ─── Formulário ───────────────────────────────────────────────────────────────

interface Props {
  /** Prefill na edição; ausente em "Novo programa". */
  defaultValues?: CampaignFormValues;
  onSubmit: (payload: CreateCampaignPayload) => Promise<void>;
  onCancel: () => void;
  isPending: boolean;
  submitLabel: string;
  pendingLabel: string;
  errorMessage?: string | null;
}

export default function CampaignForm({
  defaultValues,
  onSubmit,
  onCancel,
  isPending,
  submitLabel,
  pendingLabel,
  errorMessage,
}: Props) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: defaultValues ?? { offerType: 'CASH', niches: [] },
  });

  const offerType = watch('offerType');
  const watchedAmount = watch('offerAmountBRL');
  const watchedDescription = watch('offerDescription');
  const watchedDeadlineDays = watch('offerDeadlineDays');
  const watchedMaxSpots = watch('maxSpots');
  const watchedCommissionPercent = watch('offerCommissionPercent');

  const previewOffer =
    offerType === 'CASH'
      ? watchedAmount
        ? formatCurrency(Math.round(watchedAmount * 100))
        : null
      : offerType === 'COMMISSION'
        ? watchedCommissionPercent
          ? `${watchedCommissionPercent}% por venda`
          : null
        : watchedDescription || null;

  const busy = isSubmitting || isPending;

  // O handleSubmit do RHF re-lança o que o handler jogar — sem o catch, uma
  // falha da mutation vira unhandled rejection no browser. A mensagem real
  // chega por `errorMessage`, derivada do estado da mutation.
  async function submit(values: CampaignFormValues) {
    try {
      await onSubmit(formValuesToPayload(values));
    } catch (err: unknown) {
      console.error(err);
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)}>
      <div className="max-w-[520px]">
        <h2 className="mb-5 font-display text-d-xs text-foreground">O programa</h2>
        <div className="flex flex-col gap-6">
          <PlateField
            label="Título"
            required
            placeholder="Ex: Verão Fitness 2026"
            error={errors.title?.message}
            {...register('title')}
          />
          <PlateTextarea
            label="Descrição"
            required
            placeholder="O que você espera do conteúdo, que tipo de post quer, qual é a vibe da marca…"
            error={errors.description?.message}
            {...register('description')}
          />
          <PlateField
            label="Link do brief (opcional)"
            type="url"
            placeholder="https://drive.google.com/…"
            error={errors.briefUrl?.message}
            {...register('briefUrl')}
          />
          <div>
            <p className="mb-3 text-[12px] text-[#75756E]">
              Nichos<span className="ml-0.5 text-foreground">*</span>
            </p>
            <Controller
              name="niches"
              control={control}
              render={({ field }) => <NicheSelector value={field.value} onChange={field.onChange} />}
            />
            {errors.niches && (
              <p className="mt-1.5 text-[11px] text-destructive">{errors.niches.message}</p>
            )}
          </div>
          <div className="flex gap-[22px]">
            <div className="flex-1">
              <PlateField
                label="Vagas"
                required
                type="number"
                min={1}
                placeholder="5"
                error={errors.maxSpots?.message}
                {...register('maxSpots')}
              />
            </div>
            <div className="flex-1">
              <PlateField
                label="Inscrições até"
                type="date"
                error={errors.deadline?.message}
                {...register('deadline')}
              />
            </div>
          </div>
        </div>

        <h2 className="mb-[6px] mt-[34px] font-display text-d-xs text-foreground">A oferta</h2>
        <p className="mb-5 text-xs text-[#75756E]">É a primeira coisa que quem se candidata lê.</p>

        <Controller
          name="offerType"
          control={control}
          render={({ field }) => <OfferTypeToggle value={field.value} onChange={field.onChange} />}
        />

        <div className="flex flex-col gap-6">
          {offerType === 'CASH' ? (
            <PlateField
              label="Valor (R$)"
              required
              type="number"
              min={0}
              step={0.01}
              prefix="R$"
              placeholder="300,00"
              error={errors.offerAmountBRL?.message}
              {...register('offerAmountBRL')}
            />
          ) : offerType === 'PRODUCT' ? (
            <PlateTextarea
              label="Descrição do produto"
              required
              placeholder="Ex: Kit Whey 900g + coqueteleira da marca"
              error={errors.offerDescription?.message}
              {...register('offerDescription')}
            />
          ) : (
            <PlateField
              label="Comissão (%)"
              required
              type="number"
              min={0.01}
              max={100}
              step={0.01}
              suffix="%"
              placeholder="10"
              error={errors.offerCommissionPercent?.message}
              {...register('offerCommissionPercent')}
            />
          )}

          <div className="w-[110px]">
            <PlateField
              label={offerType === 'PRODUCT' ? 'Prazo p/ envio (dias)' : 'Prazo p/ pagamento (dias)'}
              type="number"
              min={1}
              placeholder="15"
              error={errors.offerDeadlineDays?.message}
              {...register('offerDeadlineDays')}
            />
          </div>
        </div>

        <p className="mb-[14px] mt-8 text-xs text-[#75756E]">Prévia da oferta</p>
        <Plate marks="all">
          <p className="mb-3 font-mono text-[9px] uppercase tracking-[.16em] text-plate-muted">
            O que você recebe
          </p>
          {previewOffer ? (
            <p className="font-display text-[26px] font-bold leading-[1.04] tracking-[-.045em] text-plate-ink">
              {previewOffer}
            </p>
          ) : (
            <p className="font-display text-[26px] font-bold leading-[1.04] tracking-[-.045em] text-plate-ink/[.3]">
              —
            </p>
          )}
          <p className="mt-2.5 text-xs text-plate-muted">
            {offerType === 'PRODUCT' ? 'produto enviado para você' : 'por candidatura aprovada'}
          </p>

          <div className="mb-5 mt-[22px] h-px bg-plate-line" />
          <div className="flex gap-[30px]">
            <div>
              <CountUp>
                <span className="font-display text-d-xl text-plate-ink tabular-nums">
                  {watchedDeadlineDays || '—'}
                </span>
              </CountUp>
              <p className="mt-3 text-xs text-plate-soft">
                {offerType === 'PRODUCT' ? 'dias até o envio' : 'dias até o pagamento'}
              </p>
            </div>
            <div>
              <CountUp delay={140}>
                <span className="font-display text-d-xl text-plate-ink tabular-nums">
                  {watchedMaxSpots || '—'}
                </span>
              </CountUp>
              <p className="mt-3 text-xs text-plate-soft">vagas abertas</p>
            </div>
          </div>
        </Plate>

        {errorMessage && <p className="mt-6 text-sm text-destructive">{errorMessage}</p>}

        <div className="mb-5 mt-[30px] flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[52px] w-[104px] shrink-0 rounded-lg border border-[#232323] font-display text-[14px] font-medium tracking-[-.01em] text-[#75756E] transition-colors hover:text-foreground"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={busy}
            className="min-h-[52px] flex-1 rounded-lg bg-lime font-display text-[15px] font-semibold tracking-[-.02em] text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? pendingLabel : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
