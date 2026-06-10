import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Check, Copy } from 'lucide-react';
import { useCreateCampaign, usePublishCampaign } from '../../hooks/useCampaigns';
import type { Campaign } from '../../types/api';
import { cn } from '../../lib/utils';

// ─── Nichos disponíveis (fitness) ─────────────────────────────────────────────

const NICHE_OPTIONS = [
  'fitness', 'wellness', 'musculação', 'crossfit', 'yoga',
  'corrida', 'nutrição', 'moda fitness', 'suplementação', 'lifestyle',
];

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-destructive">{message}</p>;
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-xs font-medium text-foreground">
      {children}
      {required && <span className="ml-0.5 text-destructive">*</span>}
    </label>
  );
}

function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-lime/50 focus:outline-none focus:ring-1 focus:ring-lime/30',
        className,
      )}
    />
  );
}

function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        'w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-lime/50 focus:outline-none focus:ring-1 focus:ring-lime/30 resize-none',
        className,
      )}
    />
  );
}

// ─── Modal de publicação ──────────────────────────────────────────────────────

function PublishModal({
  campaign,
  onClose,
}: {
  campaign: Campaign;
  onClose: () => void;
}) {
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-lime/10">
            <Check size={20} className="text-lime" />
          </div>
          <div>
            <p className="font-display font-semibold">Programa publicado!</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Compartilhe o link abaixo para receber candidatas.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2">
            <span className="flex-1 truncate text-xs text-muted-foreground">{applyUrl}</span>
            <button onClick={handleCopy} className="shrink-0 text-muted-foreground hover:text-foreground">
              {copied ? <Check size={14} className="text-lime" /> : <Copy size={14} />}
            </button>
          </div>
          <button
            onClick={() => navigate(`/brand/campaigns/${campaign.id}`)}
            className="w-full rounded-lg bg-lime py-2 text-sm font-semibold text-black hover:opacity-90"
          >
            Ver campanha
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 space-y-4">
        <p className="font-display font-semibold">Publicar agora?</p>
        <p className="text-sm text-muted-foreground">
          Ao publicar, o link de candidatura fica ativo na hora e creators já podem se inscrever.
          Você poderá editar os detalhes do programa a qualquer momento, mas não poderá reverter
          para rascunho.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-foreground hover:bg-accent"
          >
            Agora não
          </button>
          <button
            onClick={handlePublish}
            disabled={publish.isPending}
            className="flex-1 rounded-lg bg-lime py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50"
          >
            {publish.isPending ? 'Publicando…' : 'Publicar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

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
  const selectedNiches = watch('niches');

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
      // erro de validação do servidor ou outro — react-hook-form já exibe no form
      console.error(err);
    }
  }

  return (
    <>
      <div className="mx-auto max-w-2xl px-6 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => navigate('/brand/campaigns')}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={16} />
            Voltar
          </button>
        </div>
        <h1 className="mb-6 font-display text-2xl font-bold">Novo programa</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Informações gerais */}
          <section className="rounded-xl border border-border bg-card p-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Informações gerais
            </p>

            <div>
              <Label required>Título</Label>
              <Input {...register('title')} placeholder="Ex: Embaixadoras Verão 2026" />
              <FieldError message={errors.title?.message} />
            </div>

            <div>
              <Label required>Descrição</Label>
              <Textarea
                {...register('description')}
                rows={4}
                placeholder="Conte o que você espera das creators, que conteúdo quer e qual é a vibe da marca…"
              />
              <FieldError message={errors.description?.message} />
            </div>

            <div>
              <Label>Link do brief (opcional)</Label>
              <Input
                {...register('briefUrl')}
                placeholder="https://drive.google.com/…"
                type="url"
              />
              <FieldError message={errors.briefUrl?.message} />
            </div>
          </section>

          {/* Nichos */}
          <section className="rounded-xl border border-border bg-card p-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Nichos
            </p>
            <Controller
              name="niches"
              control={control}
              render={({ field }) => (
                <div className="flex flex-wrap gap-2">
                  {NICHE_OPTIONS.map((niche) => {
                    const selected = field.value.includes(niche);
                    return (
                      <button
                        key={niche}
                        type="button"
                        onClick={() => {
                          if (selected) {
                            field.onChange(field.value.filter((n) => n !== niche));
                          } else {
                            field.onChange([...field.value, niche]);
                          }
                        }}
                        className={cn(
                          'rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors',
                          selected
                            ? 'border-lime/40 bg-lime/10 text-lime'
                            : 'border-border bg-secondary text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {selected && <Check size={10} className="mr-1 inline" />}
                        {niche}
                      </button>
                    );
                  })}
                </div>
              )}
            />
            <FieldError message={errors.niches?.message} />
          </section>

          {/* Vagas e prazo */}
          <section className="rounded-xl border border-border bg-card p-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Vagas e prazo
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label required>Número de vagas</Label>
                <Input {...register('maxSpots')} type="number" min={1} placeholder="5" />
                <FieldError message={errors.maxSpots?.message} />
              </div>
              <div>
                <Label>Prazo de inscrição</Label>
                <Input {...register('deadline')} type="date" />
                <FieldError message={errors.deadline?.message} />
              </div>
            </div>
          </section>

          {/* Oferta */}
          <section className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Oferta
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Exibida à creator antes de candidatar — define as condições da parceria.
              </p>
            </div>

            {/* Toggle CASH / PRODUCT */}
            <Controller
              name="offerType"
              control={control}
              render={({ field }) => (
                <div className="flex rounded-lg border border-border bg-secondary p-1 w-fit gap-1">
                  {(['CASH', 'PRODUCT'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => field.onChange(type)}
                      className={cn(
                        'rounded-md px-4 py-1.5 text-xs font-semibold transition-colors',
                        field.value === type
                          ? 'bg-lime text-black'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {type === 'CASH' ? 'Dinheiro (PIX)' : 'Produto'}
                    </button>
                  ))}
                </div>
              )}
            />

            {offerType === 'CASH' && (
              <div>
                <Label required>Valor (R$)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    R$
                  </span>
                  <Input
                    {...register('offerAmountBRL')}
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="300,00"
                    className="pl-8"
                  />
                </div>
                <FieldError message={errors.offerAmountBRL?.message} />
              </div>
            )}

            {offerType === 'PRODUCT' && (
              <div>
                <Label required>Descrição do produto</Label>
                <Textarea
                  {...register('offerDescription')}
                  rows={2}
                  placeholder="Ex: Kit Whey 900g + coqueteleira da marca"
                />
                <FieldError message={errors.offerDescription?.message} />
              </div>
            )}

            <div>
              <Label>{offerType === 'CASH' ? 'Prazo para pagamento (dias após aprovação)' : 'Prazo para envio do produto (dias após aprovação)'}</Label>
              <Input
                {...register('offerDeadlineDays')}
                type="number"
                min={1}
                placeholder="15"
                className="w-32"
              />
              <FieldError message={errors.offerDeadlineDays?.message} />
            </div>
          </section>

          {/* Erro geral do servidor */}
          {createCampaign.isError && (
            <p className="text-sm text-destructive">
              Erro ao criar campanha. Verifique os campos e tente novamente.
            </p>
          )}

          {/* Ações */}
          <div className="flex items-center justify-between gap-3 pb-4">
            <button
              type="button"
              onClick={() => navigate('/brand/campaigns')}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              Cancelar
            </button>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isSubmitting || createCampaign.isPending}
                className="rounded-lg bg-lime px-6 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50"
              >
                {isSubmitting || createCampaign.isPending ? 'Salvando…' : 'Salvar rascunho'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Modal pós-criação */}
      {createdCampaign && (
        <PublishModal
          campaign={createdCampaign}
          onClose={() => {
            navigate(`/brand/campaigns/${createdCampaign.id}`);
          }}
        />
      )}
    </>
  );
}
