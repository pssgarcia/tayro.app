/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EditCampaignPage from './EditCampaignPage';
import { api } from '../../services/api';
import type { Campaign, CampaignStatus } from '../../types/api';

vi.mock('../../services/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const navigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigate, useParams: () => ({ id: 'camp-1' }) };
});

function makeCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 'camp-1',
    brandId: 'brand-1',
    title: 'Verão 2026',
    description: 'Conteúdo mostrando o produto no treino',
    briefUrl: null,
    status: 'DRAFT' as CampaignStatus,
    niches: ['fitness'],
    maxSpots: 5,
    offerType: 'CASH',
    offerAmount: 30000, // R$ 300,00 em centavos
    offerDeadlineDays: 15,
    offerDescription: null,
    deadline: '2026-09-30T00:00:00.000Z',
    createdAt: '2026-06-01T00:00:00.000Z',
    _count: { applications: 0 },
    ...overrides,
  } as any;
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <EditCampaignPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(api.get).mockReset();
  vi.mocked(api.patch).mockReset();
  navigate.mockReset();
});

describe('EditCampaignPage', () => {
  it('prefill converte centavos para reais e ISO para yyyy-MM-dd', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: makeCampaign() } as any);
    renderPage();

    expect(await screen.findByDisplayValue('Verão 2026')).toBeInTheDocument();
    // 30000 centavos não podem chegar como "30000" no campo de reais.
    expect(screen.getByDisplayValue('300')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2026-09-30')).toBeInTheDocument();
  });

  it('salvar envia PATCH com o valor de volta em centavos e volta pro detalhe', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: makeCampaign() } as any);
    vi.mocked(api.patch).mockResolvedValue({ data: makeCampaign() } as any);
    renderPage();

    fireEvent.change(await screen.findByDisplayValue('Verão 2026'), {
      target: { value: 'Verão 2026 — turma 2' },
    });
    fireEvent.change(screen.getByDisplayValue('300'), { target: { value: '450' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar alterações/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/campaigns/camp-1',
        expect.objectContaining({
          title: 'Verão 2026 — turma 2',
          offerAmount: 45000,
          offerType: 'CASH',
        }),
      );
    });
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/brand/campaigns/camp-1');
    });
  });

  // O backend recusa edição fora de DRAFT com 400 — a tela não tenta salvar o
  // que a API vai negar, explica o porquê e devolve pro detalhe.
  it.each(['ACTIVE', 'CLOSED'] as const)(
    '%s não mostra formulário, mostra o motivo',
    async (status) => {
      vi.mocked(api.get).mockResolvedValue({ data: makeCampaign({ status }) } as any);
      renderPage();

      expect(await screen.findByText(/já foi publicado e não pode mais ser editado/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /salvar alterações/i })).not.toBeInTheDocument();
    },
  );

  it('erro ao carregar não deixa a tela em branco', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('500'));
    renderPage();

    expect(await screen.findByText(/não foi possível carregar o programa/i)).toBeInTheDocument();
  });

  it('erro ao salvar mantém o form preenchido e mostra a mensagem', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: makeCampaign() } as any);
    vi.mocked(api.patch).mockRejectedValue(new Error('500'));
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /salvar alterações/i }));

    expect(await screen.findByText(/erro ao salvar as alterações/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Verão 2026')).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });
});
