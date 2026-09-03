import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type {
  CampaignPartnership,
  MyPartnershipResult,
  PartnershipResult,
  PartnershipResultPayload,
} from '../types/api';

// ─── Query keys ──────────────────────────────────────────────────────────────

export const partnershipKeys = {
  byCampaign: (campaignId: string) =>
    ['partnerships', 'campaign', campaignId] as const,
  mine: ['partnership-results', 'mine'] as const,
};

// ─── Marca ───────────────────────────────────────────────────────────────────

/** Parcerias aprovadas da campanha + o resultado de cada uma (ou null). */
export function useCampaignPartnerships(campaignId: string) {
  return useQuery({
    queryKey: partnershipKeys.byCampaign(campaignId),
    queryFn: () =>
      api
        .get<CampaignPartnership[]>(`/partnership-results/campaign/${campaignId}`)
        .then((r) => r.data),
    enabled: !!campaignId,
  });
}

export function useCreatePartnershipResult(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: PartnershipResultPayload & { applicationId: string }) =>
      api
        .post<PartnershipResult>('/partnership-results', payload)
        .then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: partnershipKeys.byCampaign(campaignId) }),
  });
}

export function useUpdatePartnershipResult(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: PartnershipResultPayload & { id: string }) =>
      api
        .patch<PartnershipResult>(`/partnership-results/${id}`, payload)
        .then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: partnershipKeys.byCampaign(campaignId) }),
  });
}

export function useDeletePartnershipResult(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/partnership-results/${id}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: partnershipKeys.byCampaign(campaignId) }),
  });
}

// ─── Creator ─────────────────────────────────────────────────────────────────

/** O que as marcas devolveram pra ela. Sem filtro: registrar é devolver. */
export function useMyPartnershipResults() {
  return useQuery({
    queryKey: partnershipKeys.mine,
    queryFn: () =>
      api
        .get<MyPartnershipResult[]>('/partnership-results/mine')
        .then((r) => r.data),
  });
}

/**
 * A creator esconde/mostra um resultado no próprio perfil público.
 * Invalida também o perfil público: é a mesma informação vista de fora, e
 * quem acabou de mudar a chave costuma abrir o link pra conferir.
 */
export function useSetResultVisibility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, hidden }: { id: string; hidden: boolean }) =>
      api
        .patch<PartnershipResult>(`/partnership-results/${id}/visibility`, {
          hidden,
        })
        .then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: partnershipKeys.mine });
      void qc.invalidateQueries({ queryKey: ['creators', 'public'] });
    },
  });
}
