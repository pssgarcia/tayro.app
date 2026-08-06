import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import type { Campaign } from '../types/api';

export const programKeys = {
  detail: (id: string) => ['programs', 'detail', id] as const,
};

// Detalhe de um programa — GET /campaigns/:id (ACTIVE é público).
export function useProgram(id: string | undefined) {
  return useQuery({
    queryKey: programKeys.detail(id ?? ''),
    queryFn: () => api.get<Campaign>(`/campaigns/${id}`).then((r) => r.data),
    enabled: !!id,
    retry: 1,
  });
}
