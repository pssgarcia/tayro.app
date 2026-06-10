import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { api } from '../services/api';
import type { Application, Campaign } from '../types/api';

// ─── Query keys ──────────────────────────────────────────────────────────────

export const campaignKeys = {
  detail: (id: string) => ['campaign', id] as const,
};

export const applicationKeys = {
  byCampaign: (campaignId: string) => ['applications', 'campaign', campaignId] as const,
};

// ─── Queries ─────────────────────────────────────────────────────────────────

export function useCampaign(campaignId: string) {
  return useQuery({
    queryKey: campaignKeys.detail(campaignId),
    queryFn: () =>
      api.get<Campaign>(`/campaigns/${campaignId}`).then((r) => r.data),
    enabled: !!campaignId,
  });
}

export function useApplications(
  campaignId: string,
  options?: { refetchInterval?: number | false | ((query: { state: { data: unknown } }) => number | false) },
) {
  return useQuery({
    queryKey: applicationKeys.byCampaign(campaignId),
    queryFn: () =>
      api
        .get<Application[]>(`/applications/campaign/${campaignId}`)
        .then((r) => r.data),
    enabled: !!campaignId,
    ...options,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useApproveApplication(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (applicationId: string) =>
      api.patch(`/applications/${applicationId}/approve`).then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: applicationKeys.byCampaign(campaignId) }),
  });
}

export function useRejectApplication(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (applicationId: string) =>
      api.patch(`/applications/${applicationId}/reject`).then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: applicationKeys.byCampaign(campaignId) }),
  });
}

/**
 * Atualiza dados de IG da creator. Em caso de 429, o backend devolve
 * `{ message, waitMinutes }` — acesse via `error.response.data.waitMinutes`.
 */
export function useRefreshApplicationIg(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (applicationId: string) =>
      api.patch(`/applications/${applicationId}/refresh-ig`).then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: applicationKeys.byCampaign(campaignId) }),
  });
}

/** Extrai o waitMinutes de um erro 429 de refresh-ig */
export function extractCooldownWait(error: unknown): number | null {
  if (
    axios.isAxiosError(error) &&
    error.response?.status === 429 &&
    typeof error.response.data?.waitMinutes === 'number'
  ) {
    return error.response.data.waitMinutes as number;
  }
  return null;
}
