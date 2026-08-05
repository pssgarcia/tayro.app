/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProgramCard from './ProgramCard';
import * as applicationHooks from '../../hooks/useMyApplications';
import type { Campaign } from '../../types/api';

vi.mock('../../hooks/useMyApplications', () => ({
  useCreateApplication: vi.fn(),
}));

function makeCampaign(over: Partial<Campaign> = {}): Campaign {
  return {
    id: 'camp-1',
    brandId: 'b1',
    title: 'Lançamento Whey',
    description: 'desc',
    briefUrl: null,
    status: 'ACTIVE' as any,
    niches: ['fitness'],
    maxSpots: 5,
    offerType: 'CASH' as any,
    offerAmount: 50000,
    offerDeadlineDays: 14,
    offerDescription: null,
    deadline: '2026-07-01T00:00:00.000Z',
    createdAt: '2026-06-01T00:00:00.000Z',
    brand: { name: 'Marca Fit', logoUrl: null, website: null },
    _count: { applications: 2 },
    ...over,
  };
}

const mutateAsync = vi.fn();

function mockCreate(overrides: Partial<{ isPending: boolean }> = {}) {
  vi.mocked(applicationHooks.useCreateApplication).mockReturnValue({
    mutateAsync,
    isPending: false,
    ...overrides,
  } as any);
}

beforeEach(() => {
  mutateAsync.mockReset();
  mockCreate();
});

describe('ProgramCard', () => {
  it('clicar na placa em destaque abre o modal de candidatura', () => {
    render(<ProgramCard campaign={makeCampaign()} variant="featured" />);
    fireEvent.click(screen.getByRole('button', { name: /ver programa/i }));
    expect(screen.getByText('Quero participar')).toBeInTheDocument();
  });

  it('clicar na row (variant default) abre o modal de candidatura', () => {
    render(<ProgramCard campaign={makeCampaign()} />);
    fireEvent.click(screen.getByRole('button', { name: /lançamento whey/i }));
    expect(screen.getByText('Quero participar')).toBeInTheDocument();
  });

  it('confirmar candidatura chama a mutation com campaignId e mensagem, mostra sucesso', async () => {
    mutateAsync.mockResolvedValueOnce({ id: 'app-1' });
    render(<ProgramCard campaign={makeCampaign()} variant="featured" />);

    fireEvent.click(screen.getByRole('button', { name: /ver programa/i }));
    fireEvent.change(screen.getByPlaceholderText(/por que você é ideal/i), {
      target: { value: 'Amo fitness!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^confirmar$/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        campaignId: 'camp-1',
        message: 'Amo fitness!',
      });
    });
    expect(screen.getByText(/candidatura enviada/i)).toBeInTheDocument();
  });

  it('confirmar sem mensagem envia message: undefined', async () => {
    mutateAsync.mockResolvedValueOnce({ id: 'app-1' });
    render(<ProgramCard campaign={makeCampaign()} variant="featured" />);

    fireEvent.click(screen.getByRole('button', { name: /ver programa/i }));
    fireEvent.click(screen.getByRole('button', { name: /^confirmar$/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        campaignId: 'camp-1',
        message: undefined,
      });
    });
  });

  it('409 (já se candidatou) mostra erro inline e mantém o form', async () => {
    mutateAsync.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 409, data: { message: 'Você já se candidatou a este programa' } },
    });
    render(<ProgramCard campaign={makeCampaign()} variant="featured" />);

    fireEvent.click(screen.getByRole('button', { name: /ver programa/i }));
    fireEvent.click(screen.getByRole('button', { name: /^confirmar$/i }));

    expect(await screen.findByText(/você já se candidatou a este programa/i)).toBeInTheDocument();
    // continua no form, não mostra a tela de sucesso
    expect(screen.queryByText(/candidatura enviada/i)).not.toBeInTheDocument();
  });

  it('erro genérico (sem response) mostra mensagem de fallback', async () => {
    mutateAsync.mockRejectedValueOnce(new Error('network down'));
    render(<ProgramCard campaign={makeCampaign()} variant="featured" />);

    fireEvent.click(screen.getByRole('button', { name: /ver programa/i }));
    fireEvent.click(screen.getByRole('button', { name: /^confirmar$/i }));

    expect(
      await screen.findByText(/não foi possível enviar sua candidatura/i),
    ).toBeInTheDocument();
  });

  it('botão Cancelar fecha o modal sem chamar a mutation', () => {
    render(<ProgramCard campaign={makeCampaign()} variant="featured" />);
    fireEvent.click(screen.getByRole('button', { name: /ver programa/i }));
    expect(screen.getByText('Quero participar')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^cancelar$/i }));

    expect(screen.queryByText('Quero participar')).not.toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });
});
