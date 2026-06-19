import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { InfluencerProfile, UpdateInfluencerPayload } from '../types/api';

export const influencerProfileKeys = {
  me: ['influencer', 'profile'] as const,
};

export function useInfluencerProfile() {
  return useQuery({
    queryKey: influencerProfileKeys.me,
    queryFn: () =>
      api.get<InfluencerProfile>('/influencers/me').then((r) => r.data),
  });
}

export function useUpdateInfluencerProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateInfluencerPayload) =>
      api.patch<InfluencerProfile>('/influencers/me', payload).then((r) => r.data),
    onSuccess: (data) => {
      qc.setQueryData(influencerProfileKeys.me, data);
    },
  });
}
