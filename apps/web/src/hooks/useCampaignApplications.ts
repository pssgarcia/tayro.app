import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { api } from '../services/api';
import type { Application, Campaign, CampaignSubmission, CampaignReward } from '../types/api';

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

export const submissionKeys = {
  byCampaign: (campaignId: string) => ['submissions', 'campaign', campaignId] as const,
};

export function useCampaignSubmissions(campaignId: string) {
  return useQuery({
    queryKey: submissionKeys.byCampaign(campaignId),
    queryFn: () =>
      api
        .get<CampaignSubmission[]>(`/submissions/campaign/${campaignId}`)
        .then((r) => r.data),
    enabled: !!campaignId,
  });
}

export function useApproveSubmission(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (submissionId: string) =>
      api.patch(`/submissions/${submissionId}/approve`).then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: submissionKeys.byCampaign(campaignId) }),
  });
}

export function useRejectSubmission(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (submissionId: string) =>
      api.patch(`/submissions/${submissionId}/reject`).then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: submissionKeys.byCampaign(campaignId) }),
  });
}

export function useRequestRevision(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, feedback }: { id: string; feedback: string }) =>
      api
        .patch(`/submissions/${id}/request-revision`, { feedback })
        .then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: submissionKeys.byCampaign(campaignId) }),
  });
}

export const rewardKeys = {
  byCampaign: (campaignId: string) => ['rewards', 'campaign', campaignId] as const,
};

export function useCampaignRewards(campaignId: string) {
  return useQuery({
    queryKey: rewardKeys.byCampaign(campaignId),
    queryFn: () =>
      api.get<CampaignReward[]>(`/rewards/campaign/${campaignId}`).then((r) => r.data),
    enabled: !!campaignId,
  });
}

export function useCreateReward(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      influencerId: string;
      campaignId: string;
      type: string;
      value: string;
      notes?: string;
    }) => api.post('/rewards', data).then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: rewardKeys.byCampaign(campaignId) }),
  });
}

export function useMarkRewardIssued(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rewardId: string) =>
      api.patch(`/rewards/${rewardId}/issue`).then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: rewardKeys.byCampaign(campaignId) }),
  });
}

export function useMarkRewardDelivered(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rewardId: string) =>
      api.patch(`/rewards/${rewardId}/deliver`).then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: rewardKeys.byCampaign(campaignId) }),
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
