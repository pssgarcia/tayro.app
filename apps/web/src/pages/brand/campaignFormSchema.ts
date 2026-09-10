import { z } from 'zod';
import type { Campaign } from '../../types/api';
import type { CreateCampaignPayload } from '../../hooks/useCampaigns';
import type { Dictionary } from '../../i18n';

// Schema + conversores do formulário de campanha, compartilhados por "Nova
// campanha" e "Editar campanha". Ficam fora do CampaignForm.tsx porque arquivo
// de componente não pode exportar helper (react-refresh/only-export-components).

/**
 * Campo numérico OPCIONAL vindo de <input type="number">.
 *
 * Input vazio chega como "" (o RHF lê o valor do DOM), e `z.coerce.number()`
 * converte "" em 0 — que então estoura o `.min(1)`. O `.optional()` não
 * protege: ele só aceita `undefined`, nunca "". O preprocess normaliza ""/null
 * pra `undefined` ANTES da coerção, que é o único ponto onde dá pra
 * diferenciar "não preencheu" de "preencheu com zero".
 *
 * Sem isso, "Prazo p/ pagamento (dias)" — opcional na API (`@IsOptional()`) e
 * sem asterisco na tela — travava a criação da campanha com "Number must be
 * greater than or equal to 1", em inglês.
 */
const optionalPositiveInt = (message: string) =>
  z.preprocess(
    (v) => (v === '' || v === null ? undefined : v),
    z.coerce.number().int().min(1, message).optional(),
  );

/**
 * yyyy-MM-dd de "hoje" no fuso do PRODUTO, não no do navegador.
 *
 * Tem que ser o mesmo cálculo do backend (`CampaignsService.assertDeadlineNotPast`),
 * senão as duas pontas discordam sobre que dia é hoje: uma marca com o relógio
 * fora do Brasil (VPN, viajando, sistema mal configurado) via o form recusar
 * uma data que a API aceitaria — ou o contrário. `en-CA` porque é o locale que
 * formata como yyyy-MM-dd, que é o formato do <input type="date"> e ordena
 * igual lexicograficamente.
 */
function todayStr(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

// Schema é função do dicionário: mensagem fixa no módulo congelaria no
// idioma do boot (ver `i18n/README.md`). É o schema compartilhado por criar e
// editar campanha.
export const criarCampaignFormSchema = (t: Dictionary) =>
  z
  .object({
    title: z.string().min(3, t.app.marca.formulario.min3),
    description: z.string().min(10, t.app.marca.formulario.min10),
    briefUrl: z.string().url(t.app.marca.formulario.urlInvalida).or(z.literal('')).optional(),
    niches: z.array(z.string()),
    maxSpots: z.coerce.number().int().min(1, t.app.marca.formulario.min1Vaga),
    // Comparação em string funciona pq yyyy-MM-dd ordena igual lexicograficamente.
    deadline: z
      .string()
      .optional()
      .refine((v) => !v || v >= todayStr(), t.app.marca.formulario.dataNoPassado),
    offerType: z.enum(['CASH', 'PRODUCT', 'COMMISSION']),
    // em R$, convertido p/ centavos no submit
    offerAmountBRL: z.preprocess(
      (v) => (v === '' || v === null ? undefined : v),
      z.coerce.number().min(0, t.app.marca.formulario.valorInvalido).optional(),
    ),
    offerDescription: z.string().optional(),
    offerDeadlineDays: optionalPositiveInt(t.app.marca.formulario.min1Dia),
    // percentual (ex: 10 = 10%)
    offerCommissionPercent: z.preprocess(
      (v) => (v === '' || v === null ? undefined : v),
      z.coerce.number().min(0.01, t.app.marca.formulario.valorInvalido).max(100, t.app.marca.formulario.max100Porcento).optional(),
    ),
  })
  .superRefine((val, ctx) => {
    if (val.offerType === 'CASH' && (!val.offerAmountBRL || val.offerAmountBRL <= 0)) {
      ctx.addIssue({
        code: 'custom',
        path: ['offerAmountBRL'],
        message: t.app.marca.formulario.informeValor,
      });
    }
    if (val.offerType === 'PRODUCT' && !val.offerDescription?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['offerDescription'],
        message: t.app.marca.formulario.descrevaProduto,
      });
    }
    if (
      val.offerType === 'COMMISSION' &&
      (!val.offerCommissionPercent || val.offerCommissionPercent <= 0)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['offerCommissionPercent'],
        message: t.app.marca.formulario.informePercentual,
      });
    }
  });

export type CampaignFormValues = z.infer<ReturnType<typeof criarCampaignFormSchema>>;

/** Campaign (API: centavos + ISO) → valores do form (R$ + yyyy-MM-dd). */
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
    offerCommissionPercent: campaign.offerCommissionPercent ?? undefined,
  };
}

/** Valores do form → payload da API (centavos; campos vazios viram undefined). */
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
    offerCommissionPercent:
      values.offerType === 'COMMISSION' ? values.offerCommissionPercent : undefined,
  };
}
