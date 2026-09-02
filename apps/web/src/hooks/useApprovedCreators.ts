import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import type { ApprovedCreator } from '../types/api';

export const approvedCreatorsKey = ['applications', 'approved'] as const;

/** Creators aprovadas em qualquer campanha da marca — specs/creator-roster. */
export function useApprovedCreators() {
  return useQuery({
    queryKey: approvedCreatorsKey,
    queryFn: () =>
      api.get<ApprovedCreator[]>('/applications/approved').then((r) => r.data),
  });
}
