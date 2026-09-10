import { useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { CreateCampaignPayload } from '../../hooks/useCampaigns';
import {
  criarCampaignFormSchema,
  formValuesToPayload,
  type CampaignFormValues,
} from './campaignFormSchema';
import { formatCurrency } from '../../utils/format';
import { cn } from '../../lib/utils';
import KineticPlate from '../../components/primitives/kinetic/KineticPlate';
import StatFigure from '../../components/primitives/kinetic/StatFigure';
import KineticField from '../../components/primitives/kinetic/KineticField';
import KineticTextarea from '../../components/primitives/kinetic/KineticTextarea';
import NicheSelector from '../../components/primitives/kinetic/NicheSelector';
import { useT } from '../../i18n';

// Formulário da campanha, compartilhado por "Nova campanha" e "Editar
// campanha". Extraído do NewCampaignPage quando a edição ganhou tela —
// duplicar ~200 linhas de form + prévia era garantia de os dois divergirem na
// primeira mudança de campo.

// ─── Segmentado CASH/PRODUCT — blocos retos, ativo em lime ──────────────────

function OfferTypeToggle({
  value,
  onChange,
}: {
  value: 'CASH' | 'PRODUCT' | 'COMMISSION';
  onChange: (v: 'CASH' | 'PRODUCT' | 'COMMISSION') => void;
}) {
  const t = useT();
  return (
    <div className="mb-7 flex flex-wrap gap-2">
      {(['CASH', 'PRODUCT', 'COMMISSION'] as const).map((type) => (
        <button
          key={type}
          type="button"
          onClick={() => onChange(type)}
          className={cn(
            'min-h-[44px] border px-4 font-mono text-[10px] uppercase tracking-[.12em] transition-colors',
            value === type
              ? 'border-lime bg-lime text-black'
              : 'border-kinetic-gray text-kinetic-muted hover:text-foreground',
          )}
        >
          {t.app.marca.formulario.tipos[type]}
        </button>
      ))}
    </div>
  );
}

// ─── Formulário ───────────────────────────────────────────────────────────────

interface Props {
  /** Prefill na edição; ausente em "Nova campanha". */
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
  const t = useT();
  const schema = useMemo(() => criarCampaignFormSchema(t), [t]);
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CampaignFormValues>({
    resolver: zodResolver(schema),
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
      <div className="max-w-[560px]">
        <h2 className="mb-6 font-mono text-[11px] uppercase tracking-widest text-kinetic-muted">
          {t.app.marca.formulario.aCampanha}
        </h2>
        <div className="flex flex-col gap-6">
          <KineticField
            label={t.app.marca.formulario.titulo}
            required
            placeholder={t.app.marca.formulario.tituloPlaceholder}
            error={errors.title?.message}
            {...register('title')}
          />
          <KineticTextarea
            label={t.app.marca.formulario.descricao}
            required
            placeholder={t.app.marca.formulario.descricaoPlaceholder}
            error={errors.description?.message}
            {...register('description')}
          />
          <KineticField
            label={t.app.marca.formulario.briefLink}
            type="url"
            placeholder={t.app.marca.formulario.briefPlaceholder}
            error={errors.briefUrl?.message}
            {...register('briefUrl')}
          />
          <div>
            <p className="mb-3 text-[12px] text-[#75756E]">{t.app.marca.formulario.nichos}</p>
            <Controller
              name="niches"
              control={control}
              render={({ field }) => (
                <NicheSelector value={field.value} onChange={field.onChange} />
              )}
            />
            {errors.niches && (
              <p className="mt-1.5 text-[11px] text-destructive">{errors.niches.message}</p>
            )}
          </div>
          <div className="flex gap-[22px]">
            <div className="flex-1">
              <KineticField
                label={t.app.marca.formulario.vagas}
                required
                type="number"
                min={1}
                placeholder="5"
                error={errors.maxSpots?.message}
                {...register('maxSpots')}
              />
            </div>
            <div className="flex-1">
              <KineticField
                label={t.app.marca.formulario.inscricoesAte}
                type="date"
                error={errors.deadline?.message}
                {...register('deadline')}
              />
            </div>
          </div>
        </div>

        <h2 className="mb-2 mt-11 font-mono text-[11px] uppercase tracking-widest text-kinetic-muted">
          {t.app.marca.formulario.aOferta}
        </h2>
        <p className="mb-5 text-xs text-[#75756E]">{t.app.marca.formulario.ofertaLegenda}</p>

        <Controller
          name="offerType"
          control={control}
          render={({ field }) => <OfferTypeToggle value={field.value} onChange={field.onChange} />}
        />

        <div className="flex flex-col gap-6">
          {offerType === 'CASH' ? (
            <KineticField
              label={t.app.marca.formulario.valor}
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
            <KineticTextarea
              label={t.app.marca.formulario.descricaoProduto}
              required
              placeholder={t.app.marca.formulario.descricaoProdutoPlaceholder}
              error={errors.offerDescription?.message}
              {...register('offerDescription')}
            />
          ) : (
            <KineticField
              label={t.app.marca.formulario.comissao}
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
            <KineticField
              label={
                offerType === 'PRODUCT' ? t.app.marca.formulario.prazoEnvio : t.app.marca.formulario.prazoPagamento
              }
              type="number"
              min={1}
              placeholder="15"
              error={errors.offerDeadlineDays?.message}
              {...register('offerDeadlineDays')}
            />
          </div>
        </div>

        <p className="mb-4 mt-11 font-mono text-[11px] uppercase tracking-widest text-kinetic-muted">
          {t.app.marca.formulario.previaOferta}
        </p>
        <KineticPlate marks="all" className="p-8">
          <p className="mb-4 font-mono text-[10px] uppercase tracking-widest text-[#6a6a64]">
            {t.app.marca.formulario.oQueRecebe}
          </p>
          {previewOffer ? (
            <p className="font-display text-[30px] font-bold leading-[1.05] tracking-[-.045em] text-black">
              {previewOffer}
            </p>
          ) : (
            <p className="font-display text-[30px] font-bold leading-[1.05] tracking-[-.045em] text-black/30">
              —
            </p>
          )}
          <p className="mt-3 text-[13px] text-[#6a6a64]">
            {offerType === 'PRODUCT' ? t.app.marca.formulario.produtoEnviado : t.app.creator.detalheCampanha.porCandidaturaAprovada}
          </p>

          <div className="my-7 h-px bg-[#c9c9c3]" />
          <div className="grid grid-cols-2 gap-6">
            <StatFigure
              label={offerType === 'PRODUCT' ? t.app.marca.formulario.diasAteEnvio : t.app.marca.formulario.diasAtePagamento}
              value={watchedDeadlineDays || '—'}
              size="md"
              tone="plate"
            />
            <StatFigure
              label={t.app.marca.formulario.vagasAbertas}
              value={watchedMaxSpots || '—'}
              size="md"
              tone="plate"
              delay={140}
            />
          </div>
        </KineticPlate>

        {errorMessage && <p className="mt-6 text-sm text-destructive">{errorMessage}</p>}

        <div className="mb-5 mt-9 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[56px] w-[130px] shrink-0 border border-kinetic-border font-mono text-[11px] font-medium uppercase tracking-widest text-kinetic-muted transition-colors hover:border-foreground hover:text-foreground"
          >
            {t.app.acoes.cancelar}
          </button>
          <button
            type="submit"
            disabled={busy}
            className="min-h-[56px] flex-1 bg-lime font-mono text-[12px] font-medium uppercase tracking-widest text-black transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? pendingLabel : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
