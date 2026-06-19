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
