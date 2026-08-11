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
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: campaignKeys.mine });
      qc.invalidateQueries({ queryKey: campaignKeys.detail(id) });
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
