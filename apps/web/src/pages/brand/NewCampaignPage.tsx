import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, ArrowRight, Check, Copy } from 'lucide-react';
import { useCreateCampaign, usePublishCampaign } from '../../hooks/useCampaigns';
import type { Campaign } from '../../types/api';
import { formatCurrency } from '../../utils/format';
import { cn } from '../../lib/utils';
import Plate from '../../components/primitives/Plate';
import CountUp from '../../components/primitives/CountUp';
import PlateField from '../../components/primitives/PlateField';
import PlateTextarea from '../../components/primitives/PlateTextarea';
import PlateActionBar from '../../components/primitives/PlateActionBar';
import NicheSelector from '../../components/primitives/NicheSelector';

// ─── Schema Zod ───────────────────────────────────────────────────────────────

const schema = z
  .object({
    title: z.string().min(3, 'Mínimo 3 caracteres'),
    description: z.string().min(10, 'Mínimo 10 caracteres'),
    briefUrl: z.string().url('URL inválida').or(z.literal('')).optional(),
    niches: z.array(z.string()).min(1, 'Selecione ao menos um nicho'),
    maxSpots: z.coerce.number().int().min(1, 'Mínimo 1 vaga'),
    deadline: z.string().optional(),
    offerType: z.enum(['CASH', 'PRODUCT']),
    offerAmountBRL: z.coerce.number().min(0).optional(), // em R$, convertido p/ centavos no submit
    offerDescription: z.string().optional(),
    offerDeadlineDays: z.coerce.number().int().min(1).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.offerType === 'CASH' && (!val.offerAmountBRL || val.offerAmountBRL <= 0)) {
      ctx.addIssue({ code: 'custom', path: ['offerAmountBRL'], message: 'Informe o valor da oferta' });
    }
    if (val.offerType === 'PRODUCT' && !val.offerDescription?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['offerDescription'], message: 'Descreva o produto oferecido' });
    }
  });

type FormValues = z.infer<typeof schema>;

// ─── Segmentado CASH/PRODUCT — trilha transparente, ativo bg-plate ──────────

function OfferTypeToggle({
  value,
  onChange,
}: {
  value: 'CASH' | 'PRODUCT';
  onChange: (v: 'CASH' | 'PRODUCT') => void;
}) {
  return (
    <div className="mb-6 flex gap-1.5">
      {(['CASH', 'PRODUCT'] as const).map((type) => (
        <button
          key={type}
          type="button"
          onClick={() => onChange(type)}
          className={cn(
            'rounded-md px-[14px] py-[9px] font-display text-[13px] font-semibold tracking-[-.02em] transition-colors',
            value === type ? 'bg-plate text-[#0A0A0A]' : 'text-[#75756E] hover:text-foreground',
          )}
        >
          {type === 'CASH' ? 'Dinheiro (PIX)' : 'Produto'}
        </button>
      ))}
    </div>
  );
}

// ─── Modal de publicação — placa-formulário, mesmo padrão do Login ───────────

function PublishModal({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  const navigate = useNavigate();
  const publish = usePublishCampaign();
  const applyUrl = `https://tayro.app/apply/${campaign.id}`;
  const [copied, setCopied] = useState(false);

  async function handlePublish() {
    await publish.mutateAsync(campaign.id);
    navigate(`/brand/campaigns/${campaign.id}`);
  }

  function handleCopy() {
    navigator.clipboard.writeText(applyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (publish.isSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
        <div className="w-full sm:max-w-md">
          <Plate marks="top" flush className="rounded-b-none sm:rounded-b-lg">
            <div className="px-6 pb-[26px] pt-[30px]">
              <p className="font-display text-d-lg text-plate-ink">Programa publicado</p>
              <p className="mt-5 text-[13px] leading-[1.5] text-plate-muted">
                Compartilhe o link abaixo para receber candidaturas.
              </p>
              <div className="mt-5 flex items-center gap-2.5 border-b border-[rgba(14,14,14,.18)] pb-[9px]">
                <span className="flex-1 truncate text-[13px] text-plate-muted">{applyUrl}</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="shrink-0 text-[#8A8A84] transition-colors hover:text-plate-ink"
                >
                  {copied ? <Check size={14} className="text-plate-ink" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
            <PlateActionBar
              primary={{
                label: 'Ver campanha',
                onClick: () => navigate(`/brand/campaigns/${campaign.id}`),
                icon: <ArrowRight size={16} />,
              }}
            />
          </Plate>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="w-full sm:max-w-md">
        <Plate marks="top" flush className="rounded-b-none sm:rounded-b-lg">
          <div className="px-6 pb-[26px] pt-[30px]">
            <p className="font-display text-d-xs text-plate-ink">Publicar agora?</p>
            <p className="mt-3 text-[13px] leading-[1.5] text-plate-muted">
              Ao publicar, o link de candidatura fica ativo na hora e creators já podem se
              inscrever. Você poderá editar os detalhes do programa a qualquer momento, mas não
              poderá reverter para rascunho.
            </p>
          </div>
          <PlateActionBar
            secondary={{ label: 'Agora não', onClick: onClose, width: 100 }}
            primary={{
              label: publish.isPending ? 'Publicando…' : 'Publicar',
              onClick: handlePublish,
              disabled: publish.isPending,
              icon: <ArrowRight size={16} />,
            }}
          />
        </Plate>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
// Tela 15 do redesign 2a, a última — e a mais longa. As 4 section com bg-card
// viram 2 seções tipográficas; a placa é a "Prévia da creator", montada ao
// vivo com watch() — é o que justifica a placa numa tela sem número herói, e
// a maior alavanca de conversão: a marca vê o resultado antes de publicar.

export default function NewCampaignPage() {
  const navigate = useNavigate();
  const createCampaign = useCreateCampaign();
  const [createdCampaign, setCreatedCampaign] = useState<Campaign | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { offerType: 'CASH', niches: [] },
  });

  const offerType = watch('offerType');
  const watchedAmount = watch('offerAmountBRL');
  const watchedDescription = watch('offerDescription');
  const watchedDeadlineDays = watch('offerDeadlineDays');
  const watchedMaxSpots = watch('maxSpots');

  async function onSubmit(values: FormValues) {
    const payload = {
      title: values.title,
      description: values.description,
      briefUrl: values.briefUrl || undefined,
      niches: values.niches,
      maxSpots: values.maxSpots,
      deadline: values.deadline || undefined,
      offerType: values.offerType,
      offerAmount: values.offerType === 'CASH' ? Math.round((values.offerAmountBRL ?? 0) * 100) : undefined,
      offerDescription: values.offerType === 'PRODUCT' ? values.offerDescription : undefined,
      offerDeadlineDays: values.offerDeadlineDays || undefined,
    };

    try {
      const campaign = await createCampaign.mutateAsync(payload);
      setCreatedCampaign(campaign);
    } catch (err: unknown) {
      console.error(err);
    }
  }

  const previewOffer =
    offerType === 'CASH'
      ? watchedAmount
        ? formatCurrency(Math.round(watchedAmount * 100))
        : null
      : watchedDescription || null;

  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-[60px] items-center justify-between px-6">
        <span className="font-display text-[19px] font-bold tracking-[-.05em] text-foreground">
          tay<span className="text-lime">ro</span>
        </span>
        <Link
          to="/brand/campaigns"
          className="flex items-center gap-[7px] text-[13px] text-[#75756E] transition-colors hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Voltar
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-10">
        <h1 className="mb-[30px] font-display text-d-md text-foreground">Novo programa</h1>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="max-w-[520px]">
            <h2 className="mb-5 font-display text-d-xs text-foreground">O programa</h2>
            <div className="flex flex-col gap-6">
              <PlateField
                label="Título"
                required
                placeholder="Ex: Embaixadoras Verão 2026"
                error={errors.title?.message}
                {...register('title')}
              />
              <PlateTextarea
                label="Descrição"
                required
                placeholder="O que você espera das creators, que conteúdo quer, qual é a vibe da marca…"
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
            <p className="mb-5 text-xs text-[#75756E]">É a primeira coisa que a creator lê.</p>

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
              ) : (
                <PlateTextarea
                  label="Descrição do produto"
                  required
                  placeholder="Ex: Kit Whey 900g + coqueteleira da marca"
                  error={errors.offerDescription?.message}
                  {...register('offerDescription')}
                />
              )}

              <div className="w-[110px]">
                <PlateField
                  label={
                    offerType === 'CASH'
                      ? 'Prazo p/ pagamento (dias)'
                      : 'Prazo p/ envio (dias)'
                  }
                  type="number"
                  min={1}
                  placeholder="15"
                  error={errors.offerDeadlineDays?.message}
                  {...register('offerDeadlineDays')}
                />
              </div>
            </div>

            <p className="mb-[14px] mt-8 text-xs text-[#75756E]">Prévia da creator</p>
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
                {offerType === 'CASH' ? 'por candidatura aprovada' : 'produto enviado para você'}
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
                    {offerType === 'CASH' ? 'dias até o pagamento' : 'dias até o envio'}
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

            {createCampaign.isError && (
              <p className="mt-6 text-sm text-destructive">
                Erro ao criar campanha. Verifique os campos e tente novamente.
              </p>
            )}

            <div className="mb-5 mt-[30px] flex gap-3">
              <button
                type="button"
                onClick={() => navigate('/brand/campaigns')}
                className="min-h-[52px] w-[104px] shrink-0 rounded-lg border border-[#232323] font-display text-[14px] font-medium tracking-[-.01em] text-[#75756E] transition-colors hover:text-foreground"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || createCampaign.isPending}
                className="min-h-[52px] flex-1 rounded-lg bg-lime font-display text-[15px] font-semibold tracking-[-.02em] text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting || createCampaign.isPending ? 'Salvando…' : 'Salvar rascunho'}
              </button>
            </div>
          </div>
        </form>
      </main>

      {createdCampaign && (
        <PublishModal
          campaign={createdCampaign}
          onClose={() => navigate(`/brand/campaigns/${createdCampaign.id}`)}
        />
      )}
    </div>
  );
}
