/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCloseCampaign, useDeleteCampaign, usePublishCampaign } from './useCampaigns';
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
    // close só é alcançável a partir de CampaignDetailPage já carregado — a
    // tela sempre tem cache prévio nessa chave antes do clique existir.
    queryClient.setQueryData(campaignDetailKeys.detail('camp-1'), {
      id: 'camp-1',
      status: 'ACTIVE',
    });
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

  // Mesma proteção de usePublishCampaign, por simetria — close nunca deveria
  // ser alcançável sem cache prévio na prática, mas o hook não deve confiar
  // nisso e inventar um objeto incompleto se algum dia for.
  it('não grava a resposta incompleta do PATCH quando não há cache prévio', async () => {
    const updated = { id: 'camp-1', status: 'CLOSED' };
    vi.mocked(api.patch).mockResolvedValue({ data: updated } as any);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useCloseCampaign(), { wrapper: makeWrapper(queryClient) });

    result.current.mutate('camp-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData(campaignDetailKeys.detail('camp-1'))).toBeUndefined();
  });
});

describe('usePublishCampaign', () => {
  it('chama PATCH /campaigns/:id/publish', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: {} } as any);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => usePublishCampaign(), { wrapper: makeWrapper(queryClient) });

    result.current.mutate('camp-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.patch).toHaveBeenCalledWith('/campaigns/camp-1/publish');
  });

  it('escreve a campanha atualizada no cache quando já existe uma entrada', async () => {
    const updated = { id: 'camp-1', status: 'ACTIVE' };
    vi.mocked(api.patch).mockResolvedValue({ data: updated } as any);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(campaignDetailKeys.detail('camp-1'), {
      id: 'camp-1',
      status: 'DRAFT',
      _count: { applications: 0 },
    });
    const { result } = renderHook(() => usePublishCampaign(), { wrapper: makeWrapper(queryClient) });

    result.current.mutate('camp-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData(campaignDetailKeys.detail('camp-1'))).toEqual({
      id: 'camp-1',
      status: 'ACTIVE',
      _count: { applications: 0 },
    });
  });

  // Regressão ao vivo (local e produção, 2026-08-31): publicar direto do modal
  // pós-criação (NewCampaignPage) navega pra `/brand/campaigns/:id` — uma
  // página que NUNCA foi visitada, então não existe cache prévio na chave
  // singular (`useCampaign`). O código antigo tratava esse caso como seguro
  // ("navega pra tela ainda sem cache") e escrevia a resposta crua do PATCH
  // (sem `_count`) como se fosse a campanha inteira. CampaignDetailPage lê
  // `campaign._count.applications` incondicionalmente e quebrava com
  // "Cannot read properties of undefined (reading 'applications')" assim que
  // a tela montava. Sem cache prévio, o hook não deve inventar um objeto
  // incompleto — melhor deixar `useCampaign` buscar a campanha completa.
  it('não grava a resposta incompleta do PATCH quando não há cache prévio', async () => {
    const updated = { id: 'camp-1', status: 'ACTIVE' };
    vi.mocked(api.patch).mockResolvedValue({ data: updated } as any);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => usePublishCampaign(), { wrapper: makeWrapper(queryClient) });

    result.current.mutate('camp-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData(campaignDetailKeys.detail('camp-1'))).toBeUndefined();
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
