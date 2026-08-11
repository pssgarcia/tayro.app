/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCloseCampaign, useDeleteCampaign } from './useCampaigns';
import { campaignKeys as campaignDetailKeys } from './useCampaignApplications';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: { patch: vi.fn(), delete: vi.fn() },
}));

function makeWrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useCloseCampaign', () => {
  it('chama PATCH /campaigns/:id/close', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: {} } as any);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useCloseCampaign(), { wrapper: makeWrapper(queryClient) });

    result.current.mutate('camp-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.patch).toHaveBeenCalledWith('/campaigns/camp-1/close');
  });

  // Regressão: usePublishCampaign invalida campaignKeys.detail(id) local
  // (['campaigns', id]), mas useCampaign (useCampaignApplications.ts) lê de
  // ['campaign', id] (singular) - chaves diferentes. Confirmado ao vivo com o
  // app rodando: invalidateQueries na chave certa não disparava o refetch da
  // query ativa (a campanha continuava ACTIVE na tela após encerrar com
  // sucesso no backend) - por isso o hook escreve a resposta direto no cache
  // (setQueryData) em vez de invalidar.
  it('escreve a campanha atualizada no cache da chave real usada por useCampaign', async () => {
    const updated = { id: 'camp-1', status: 'CLOSED' };
    vi.mocked(api.patch).mockResolvedValue({ data: updated } as any);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useCloseCampaign(), { wrapper: makeWrapper(queryClient) });

    result.current.mutate('camp-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData(campaignDetailKeys.detail('camp-1'))).toEqual(updated);
  });

  // Regressão: a resposta do PATCH /close não inclui `_count` (o GET
  // /campaigns/:id sim) - sobrescrever o cache inteiro com ela quebrava o
  // header/Briefing, que leem `campaign._count.applications` (TypeError ao
  // vivo: "Cannot read properties of undefined (reading 'applications')").
  it('preserva campos do cache anterior que a resposta do close não traz (ex.: _count)', async () => {
    const updated = { id: 'camp-1', status: 'CLOSED' };
    vi.mocked(api.patch).mockResolvedValue({ data: updated } as any);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(campaignDetailKeys.detail('camp-1'), {
      id: 'camp-1',
      status: 'ACTIVE',
      _count: { applications: 3 },
    });
    const { result } = renderHook(() => useCloseCampaign(), { wrapper: makeWrapper(queryClient) });

    result.current.mutate('camp-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData(campaignDetailKeys.detail('camp-1'))).toEqual({
      id: 'camp-1',
      status: 'CLOSED',
      _count: { applications: 3 },
    });
  });
});

describe('useDeleteCampaign', () => {
  it('chama DELETE /campaigns/:id', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: {} } as any);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useDeleteCampaign(), { wrapper: makeWrapper(queryClient) });

    result.current.mutate('camp-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.delete).toHaveBeenCalledWith('/campaigns/camp-1');
  });
});
