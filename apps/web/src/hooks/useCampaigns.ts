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
  offerType?: 'CASH' | 'PRODUCT';
  offerAmount?: number;
  offerDeadlineDays?: number;
  offerDescription?: string;
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
      // no cache real. Ficou mascarado enquanto o publish só existia no
      // NewCampaignPage, que navega pra uma tela ainda sem cache; publicando
      // de dentro do detalhe, o status ficaria DRAFT na tela após o 200.
      // Merge em vez de substituir: a resposta do PATCH não traz `_count`, que
      // o header e o Briefing leem.
      qc.setQueryData(campaignDetailKeys.detail(id), (old: Campaign | undefined) =>
        old ? { ...old, ...updated } : updated,
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
      qc.setQueryData(campaignDetailKeys.detail(id), (old: Campaign | undefined) =>
        old ? { ...old, ...updated } : updated,
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
      // ['campaign', id] singular). usePublishCampaign herda esse descompasso
      // (mascarado: publish sempre navega pra uma página sem cache ainda).
      // Faz merge, não substitui: a resposta do PATCH /close não inclui
      // `_count` (o GET /campaigns/:id sim) - sobrescrever o cache inteiro
      // com ela quebra o header/Briefing, que leem `campaign._count.applications`.
      qc.setQueryData(campaignDetailKeys.detail(id), (old: Campaign | undefined) =>
        old ? { ...old, ...updated } : updated,
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
