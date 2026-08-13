import { z } from 'zod';
import type { Campaign } from '../../types/api';
import type { CreateCampaignPayload } from '../../hooks/useCampaigns';

// Schema + conversores do formulário de programa, fora do CampaignForm.tsx:
// arquivo de componente só pode exportar componentes (react-refresh).

/**
 * Campo numérico opcional vindo de <input type="number">.
 *
 * Input vazio chega como "" (o RHF lê do DOM), e `z.coerce.number()` converte
 * "" em 0 — que então estoura o `.min(1)`. `.optional()` não salva: ele só
 * aceita `undefined`, nunca "". Resultado do bug: "Prazo p/ pagamento (dias)",
 * que é opcional na API (`@IsOptional()`), travava o submit de Novo programa
 * com "Number must be greater than or equal to 1" — em inglês, num campo sem
 * asterisco. Pego por teste ao cobrir a criação (2026-08-13).
 */
const optionalPositiveInt = (message: string) =>
  z.preprocess(
    (v) => (v === '' || v === null ? undefined : v),
    z.coerce.number().int().min(1, message).optional(),
  );

export const campaignFormSchema = z
  .object({
    title: z.string().min(3, 'Mínimo 3 caracteres'),
    description: z.string().min(10, 'Mínimo 10 caracteres'),
    briefUrl: z.string().url('URL inválida').or(z.literal('')).optional(),
    niches: z.array(z.string()).min(1, 'Selecione ao menos um nicho'),
    maxSpots: z.coerce.number().int().min(1, 'Mínimo 1 vaga'),
    deadline: z.string().optional(),
    offerType: z.enum(['CASH', 'PRODUCT']),
    // em R$, convertido p/ centavos no submit
    offerAmountBRL: z.preprocess(
      (v) => (v === '' || v === null ? undefined : v),
      z.coerce.number().min(0, 'Valor inválido').optional(),
    ),
    offerDescription: z.string().optional(),
    offerDeadlineDays: optionalPositiveInt('Mínimo 1 dia'),
  })
  .superRefine((val, ctx) => {
    if (val.offerType === 'CASH' && (!val.offerAmountBRL || val.offerAmountBRL <= 0)) {
      ctx.addIssue({
        code: 'custom',
        path: ['offerAmountBRL'],
        message: 'Informe o valor da oferta',
      });
    }
    if (val.offerType === 'PRODUCT' && !val.offerDescription?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['offerDescription'],
        message: 'Descreva o produto oferecido',
      });
    }
  });

export type CampaignFormValues = z.infer<typeof campaignFormSchema>;

/** Campaign (API, centavos + ISO) → valores do form (R$ + yyyy-MM-dd). */
export function campaignToFormValues(campaign: Campaign): CampaignFormValues {
  return {
    title: campaign.title,
    description: campaign.description,
    briefUrl: campaign.briefUrl ?? '',
    niches: campaign.niches,
    maxSpots: campaign.maxSpots,
    // <input type="date"> só aceita yyyy-MM-dd; a API devolve ISO completo.
    deadline: campaign.deadline ? campaign.deadline.slice(0, 10) : '',
    offerType: campaign.offerType ?? 'CASH',
    offerAmountBRL: campaign.offerAmount != null ? campaign.offerAmount / 100 : undefined,
    offerDescription: campaign.offerDescription ?? '',
    offerDeadlineDays: campaign.offerDeadlineDays ?? undefined,
  };
}

/** Valores do form → payload da API (centavos, campos vazios viram undefined). */
export function formValuesToPayload(values: CampaignFormValues): CreateCampaignPayload {
  return {
    title: values.title,
    description: values.description,
    briefUrl: values.briefUrl || undefined,
    niches: values.niches,
    maxSpots: values.maxSpots,
    deadline: values.deadline || undefined,
    offerType: values.offerType,
    offerAmount:
      values.offerType === 'CASH' ? Math.round((values.offerAmountBRL ?? 0) * 100) : undefined,
    offerDescription: values.offerType === 'PRODUCT' ? values.offerDescription : undefined,
    offerDeadlineDays: values.offerDeadlineDays || undefined,
  };
}
