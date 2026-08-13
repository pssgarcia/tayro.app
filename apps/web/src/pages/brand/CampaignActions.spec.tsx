/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CampaignActions from './CampaignActions';
import { api } from '../../services/api';
import type { Campaign, CampaignStatus } from '../../types/api';

// Mocka o `api`, não os hooks: o que precisa estar certo aqui é o endpoint que
// cada ação chama. Mockar os hooks só provaria que o botão renderiza.
vi.mock('../../services/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const navigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigate };
});

function makeCampaign(status: CampaignStatus): Campaign {
  return {
    id: 'camp-1',
    brandId: 'brand-1',
    title: 'Verão 2026',
    description: 'Descrição do programa',
    briefUrl: null,
    status,
    niches: ['fitness'],
    maxSpots: 5,
    offerType: 'CASH',
    offerAmount: 30000,
    offerDeadlineDays: 15,
    offerDescription: null,
    deadline: null,
    createdAt: '2026-06-01T00:00:00.000Z',
    _count: { applications: 0 },
  } as any;
}

function renderActions(status: CampaignStatus) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CampaignActions campaign={makeCampaign(status)} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(api.patch).mockReset();
  vi.mocked(api.delete).mockReset();
  navigate.mockReset();
});

describe('CampaignActions — quais ações aparecem por status', () => {
  it('DRAFT oferece publicar, editar e excluir', () => {
    renderActions('DRAFT');

    expect(screen.getByRole('button', { name: /publicar/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /editar/i })).toHaveAttribute(
      'href',
      '/brand/campaigns/camp-1/edit',
    );
    expect(screen.getByRole('button', { name: /excluir/i })).toBeInTheDocument();
    // Encerrar é transição de ACTIVE — rascunho nunca foi publicado.
    expect(screen.queryByRole('button', { name: /encerrar/i })).not.toBeInTheDocument();
  });

  it('ACTIVE oferece só encerrar (publicado não edita nem apaga)', () => {
    renderActions('ACTIVE');

    expect(screen.getByRole('button', { name: /encerrar/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /publicar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /editar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /excluir/i })).not.toBeInTheDocument();
  });

  it.each(['CLOSED', 'COMPLETED'] as const)('%s é terminal: nenhuma ação', (status) => {
    renderActions(status);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('CampaignActions — transições', () => {
  /** Abre a confirmação e devolve o modal, onde o botão que age de verdade mora. */
  async function openDialog(barButton: RegExp) {
    fireEvent.click(screen.getByRole('button', { name: barButton }));
    return within(await screen.findByRole('dialog'));
  }

  it('publicar confirma antes e chama PATCH /campaigns/:id/publish', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: makeCampaign('ACTIVE') } as any);
    renderActions('DRAFT');

    const dialog = await openDialog(/publicar/i);

    // Confirmação primeiro — clicar na barra não pode publicar direto.
    expect(await screen.findByText(/publicar programa\?/i)).toBeInTheDocument();
    expect(api.patch).not.toHaveBeenCalled();

    fireEvent.click(dialog.getByRole('button', { name: /^publicar$/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/campaigns/camp-1/publish');
    });
  });

  it('encerrar chama PATCH /campaigns/:id/close', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: makeCampaign('CLOSED') } as any);
    renderActions('ACTIVE');

    const dialog = await openDialog(/encerrar/i);
    expect(api.patch).not.toHaveBeenCalled();
    fireEvent.click(dialog.getByRole('button', { name: /^encerrar$/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/campaigns/camp-1/close');
    });
  });

  it('excluir chama DELETE e volta para a lista (o programa deixou de existir)', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: null } as any);
    renderActions('DRAFT');

    const dialog = await openDialog(/excluir/i);
    expect(api.delete).not.toHaveBeenCalled();
    fireEvent.click(dialog.getByRole('button', { name: /^excluir$/i }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/campaigns/camp-1');
    });
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/brand/campaigns');
    });
  });

  it('cancelar na confirmação não dispara nada', async () => {
    renderActions('ACTIVE');

    const dialog = await openDialog(/encerrar/i);
    fireEvent.click(dialog.getByRole('button', { name: /^cancelar$/i }));

    expect(api.patch).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('falha na transição mantém o modal aberto com o erro', async () => {
    vi.mocked(api.patch).mockRejectedValue(new Error('500'));
    renderActions('ACTIVE');

    const dialog = await openDialog(/encerrar/i);
    fireEvent.click(dialog.getByRole('button', { name: /^encerrar$/i }));

    expect(await screen.findByText(/não foi possível concluir/i)).toBeInTheDocument();
    // Não some por baixo do usuário: dá pra tentar de novo.
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
