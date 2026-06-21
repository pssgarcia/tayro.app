import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import type { MyReward } from '../types/api';

export const myRewardKeys = {
  all: ['rewards', 'mine'] as const,
};

export function useMyRewards() {
  return useQuery({
    queryKey: myRewardKeys.all,
    queryFn: () => api.get<MyReward[]>('/rewards/mine').then((r) => r.data),
  });
}
