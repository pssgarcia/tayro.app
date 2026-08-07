import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import type { PublicCreatorProfile } from '../types/api';

export const publicCreatorProfileKeys = {
  detail: (handle: string) => ['creators', 'public', handle] as const,
};

// Perfil público — GET /creators/:handle/public (sem auth). 404 tanto para
// handle inexistente quanto para publicProfileEnabled=false (anti-enumeração,
// não diferenciar no front).
export function usePublicCreatorProfile(handle: string | undefined) {
  return useQuery({
    queryKey: publicCreatorProfileKeys.detail(handle ?? ''),
    queryFn: () =>
      api.get<PublicCreatorProfile>(`/creators/${handle}/public`).then((r) => r.data),
    enabled: !!handle,
    retry: 1,
  });
}
