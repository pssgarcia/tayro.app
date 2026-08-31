import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { Campaign } from '../types/api';
import { campaignKeys as campaignDetailKeys } from './useCampaignApplications';

export const campaignKeys = {
  mine: ['campaigns', 'mine'] as const,
  detail: (id: string) => ['campaigns', id] as const,
};

export function useCampaigns() {
  return useQuery({
    queryKey: campaignKeys.mine,
    queryFn: () => api.get<Campaign[]>('/campaigns/mine').then((r) => r.data),
  });
}

export interface CreateCampaignPayload {
  title: string;
  description: string;
  briefUrl?: string;
  niches: string[];
  maxSpots: number;
  deadline?: string;
  offerType?: 'CASH' | 'PRODUCT' | 'COMMISSION';
  offerAmount?: number;
  offerDeadlineDays?: number;
  offerDescription?: string;
  offerCommissionPercent?: number;
}

/** PATCH /campaigns/:id aceita o mesmo shape, todos os campos opcionais. */
export type UpdateCampaignPayload = Partial<CreateCampaignPayload>;

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCampaignPayload) =>
      api.post<Campaign>('/campaigns', payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: campaignKeys.mine }),
  });
}

export function usePublishCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.patch<Campaign>(`/campaigns/${id}/publish`).then((r) => r.data),
    onSuccess: (updated, id) => {
      qc.invalidateQueries({ queryKey: campaignKeys.mine });
      // Mesmo tratamento do close, e pela mesma razão: `campaignKeys.detail`
      // daqui é ['campaigns', id], enquanto `useCampaign` lê ['campaign', id]
      // (singular, em useCampaignApplications) — invalidar aqui nunca chegava
      // no cache real. Merge em vez de substituir: a resposta do PATCH não
      // traz `_count`, que o header e o Briefing leem.
      //
      // Sem `old`, NÃO grava a resposta crua do PATCH (MORDEU ao vivo, local
      // e produção, 2026-08-31): publicar direto do modal pós-criação
      // (NewCampaignPage) navega pra `/brand/campaigns/:id`, uma tela nunca
      // visitada — sem cache prévio nessa chave. Escrever `updated` (sem
      // `_count`) como se fosse a campanha inteira fazia CampaignDetailPage
      // quebrar ao montar ("Cannot read properties of undefined (reading
      // 'applications')"). Retornar `undefined` é no-op pro React Query —
      // sem cache prévio, a tela busca a campanha completa de verdade.
      qc.setQueryData(campaignDetailKeys.detail(id), (old: Campaign | undefined) =>
        old ? { ...old, ...updated } : undefined,
      );
    },
  });
}

/** Editar campanha — só DRAFT (o backend recusa ACTIVE/CLOSED com 400). */
export function useUpdateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCampaignPayload }) =>
      api.patch<Campaign>(`/campaigns/${id}`, payload).then((r) => r.data),
    onSuccess: (updated, { id }) => {
      qc.invalidateQueries({ queryKey: campaignKeys.mine });
      // Sem `old`, não grava a resposta crua do PATCH — mesmo risco de
      // `usePublishCampaign` (ver comentário lá): sem `_count`, quebraria
      // CampaignDetailPage se essa tela nunca foi visitada antes.
      qc.setQueryData(campaignDetailKeys.detail(id), (old: Campaign | undefined) =>
        old ? { ...old, ...updated } : undefined,
      );
    },
  });
}

export function useCloseCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.patch<Campaign>(`/campaigns/${id}/close`).then((r) => r.data),
    onSuccess: (updated, id) => {
      qc.invalidateQueries({ queryKey: campaignKeys.mine });
      // Escreve a campanha atualizada direto no cache em vez de invalidar +
      // esperar refetch - campaignKeys.detail aqui é ['campaigns', id],
      // diferente da chave real usada por useCampaign (useCampaignApplications.ts,
      // ['campaign', id] singular). usePublishCampaign herda esse descompasso.
      // Faz merge, não substitui: a resposta do PATCH /close não inclui
      // `_count` (o GET /campaigns/:id sim) - sobrescrever o cache inteiro
      // com ela quebra o header/Briefing, que leem `campaign._count.applications`.
      // Sem `old`, não grava a resposta crua — mesmo risco de `usePublishCampaign`
      // (MORDEU ao vivo lá, ver comentário): sem cache prévio, undefined é
      // no-op e deixa a tela buscar a campanha completa.
      qc.setQueryData(campaignDetailKeys.detail(id), (old: Campaign | undefined) =>
        old ? { ...old, ...updated } : undefined,
      );
    },
  });
}

export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/campaigns/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: campaignKeys.mine }),
  });
}
