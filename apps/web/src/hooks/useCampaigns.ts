import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { Campaign } from '../types/api';
import { campaignKeys as campaignDetailKeys } from './useCampaignApplications';

// A chave do DETALHE não mora aqui: quem consome o detalhe é useCampaign(), em
// useCampaignApplications, com ['campaign', id] (singular). Este arquivo tinha
// uma segunda `detail` com ['campaigns', id] (plural) — o invalidate do publish
// acertava uma chave que nenhuma query lia. Não quebrava nada só porque o
// publish acontecia no NewCampaignPage e navegava em seguida, remontando a
// tela. Com publicar/encerrar rodando dentro do próprio detalhe, o cache
// precisa invalidar de verdade. (Auditoria 2026-08-13.)
export const campaignKeys = {
  mine: ['campaigns', 'mine'] as const,
};

/** Invalida lista + detalhe após qualquer transição de estado do programa. */
function useCampaignMutation<TArgs>(
  mutationFn: (args: TArgs) => Promise<unknown>,
  idOf: (args: TArgs) => string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (_data, args) => {
      qc.invalidateQueries({ queryKey: campaignKeys.mine });
      qc.invalidateQueries({ queryKey: campaignDetailKeys.detail(idOf(args)) });
    },
  });
}

export function useCampaigns() {
  return useQuery({
    queryKey: campaignKeys.mine,
    queryFn: () => api.get<Campaign[]>('/campaigns/mine').then((r) => r.data),
  });
}

export interface CreateCampaignPayload {
  title: string;
  description: string;
  briefUrl?: string;
  niches: string[];
  maxSpots: number;
  deadline?: string;
  offerType?: 'CASH' | 'PRODUCT';
  offerAmount?: number;
  offerDeadlineDays?: number;
  offerDescription?: string;
}

/** PATCH /campaigns/:id aceita o mesmo shape, todos os campos opcionais. */
export type UpdateCampaignPayload = Partial<CreateCampaignPayload>;

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCampaignPayload) =>
      api.post<Campaign>('/campaigns', payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: campaignKeys.mine }),
  });
}

export function usePublishCampaign() {
  return useCampaignMutation(
    (id: string) => api.patch<Campaign>(`/campaigns/${id}/publish`).then((r) => r.data),
    (id) => id,
  );
}

/** Só DRAFT — o backend rejeita ACTIVE/CLOSED com 400. */
export function useUpdateCampaign() {
  return useCampaignMutation(
    ({ id, payload }: { id: string; payload: UpdateCampaignPayload }) =>
      api.patch<Campaign>(`/campaigns/${id}`, payload).then((r) => r.data),
    ({ id }) => id,
  );
}

/** ACTIVE → CLOSED. Irreversível: não existe rota de reabertura. */
export function useCloseCampaign() {
  return useCampaignMutation(
    (id: string) => api.patch<Campaign>(`/campaigns/${id}/close`).then((r) => r.data),
    (id) => id,
  );
}

/** Só DRAFT — programa publicado nunca é deletado (levaria candidaturas junto). */
export function useDeleteCampaign() {
  return useCampaignMutation(
    (id: string) => api.delete(`/campaigns/${id}`).then((r) => r.data),
    (id) => id,
  );
}
