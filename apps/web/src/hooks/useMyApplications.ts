import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { MyApplication } from '../types/api';

export const myApplicationKeys = {
  all: ['applications', 'mine'] as const,
};

export function useMyApplications() {
  return useQuery({
    queryKey: myApplicationKeys.all,
    queryFn: () =>
      api.get<MyApplication[]>('/applications/mine').then((r) => r.data),
  });
}

export function useWithdrawApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (applicationId: string) =>
      api.patch(`/applications/${applicationId}/withdraw`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: myApplicationKeys.all }),
  });
}

export interface CreateApplicationPayload {
  campaignId: string;
  message?: string;
}

// Apply autenticado — creator já logada se candidata direto do browse,
// sem passar pelo fluxo público (/apply/:id) que cria conta nova.
export function useCreateApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateApplicationPayload) =>
      api.post('/applications', payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: myApplicationKeys.all }),
  });
}
