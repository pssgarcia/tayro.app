import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import type { ClaimPreview } from '../types/api';

export const claimPreviewKeys = {
  byToken: (token: string) => ['claim-preview', token] as const,
};

/** GET /auth/claim/:token — não consome o token, só valida e traz identidade. */
export function useClaimPreview(token: string | null, enabled: boolean) {
  return useQuery({
    queryKey: claimPreviewKeys.byToken(token ?? ''),
    queryFn: () => api.get<ClaimPreview>(`/auth/claim/${token}`).then((r) => r.data),
    enabled: !!token && enabled,
    retry: false,
  });
}
