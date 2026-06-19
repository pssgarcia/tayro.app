import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { BrandProfile, UpdateBrandPayload } from '../types/api';

export const brandProfileKeys = {
  me: ['brand', 'profile'] as const,
};

export function useBrandProfile() {
  return useQuery({
    queryKey: brandProfileKeys.me,
    queryFn: () => api.get<BrandProfile>('/brands/me').then((r) => r.data),
  });
}

export function useUpdateBrandProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateBrandPayload) =>
      api.patch<BrandProfile>('/brands/me', payload).then((r) => r.data),
    onSuccess: (data) => {
      qc.setQueryData(brandProfileKeys.me, data);
    },
  });
}
