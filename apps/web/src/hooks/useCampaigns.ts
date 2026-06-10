import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { Campaign } from '../types/api';

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
