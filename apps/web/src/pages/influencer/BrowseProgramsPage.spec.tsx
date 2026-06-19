/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BrowseProgramsPage from './BrowseProgramsPage';
import * as hook from '../../hooks/useBrowsePrograms';
import type { Campaign, Paginated } from '../../types/api';

vi.mock('../../hooks/useBrowsePrograms', () => ({
  useBrowsePrograms: vi.fn(),
  browseProgramsKeys: { list: (p: number) => ['programs', 'browse', p] },
}));

function makeCampaign(over: Partial<Campaign> = {}): Campaign {
  return {
    id: 'camp-1',
    brandId: 'b1',
    title: 'Lançamento Whey',
    description: 'desc',
    briefUrl: null,
    status: 'ACTIVE' as any,
    niches: ['fitness', 'wellness'],
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

function mockHook(
  result: Partial<{
    data: Paginated<Campaign>;
    isLoading: boolean;
    isError: boolean;
    isPlaceholderData: boolean;
  }>,
) {
  vi.mocked(hook.useBrowsePrograms).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    isPlaceholderData: false,
    ...result,
  } as any);
}

function renderPage() {
  return render(
    <MemoryRouter>
      <BrowseProgramsPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(hook.useBrowsePrograms).mockReset();
});

describe('BrowseProgramsPage', () => {
  it('mostra skeleton enquanto carrega', () => {
    mockHook({ isLoading: true });
    const { container } = renderPage();
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('mostra erro em isError', () => {
    mockHook({ isError: true });
    renderPage();
    expect(screen.getByText(/erro ao carregar os programas/i)).toBeInTheDocument();
  });

  it('mostra empty state quando não há programas', () => {
    mockHook({
      data: { data: [], meta: { total: 0, page: 1, limit: 12, totalPages: 0 } },
    });
    renderPage();
    expect(screen.getByText(/nenhum programa aberto agora/i)).toBeInTheDocument();
  });

  it('renderiza os cards e o link de candidatura aponta pro /apply/:id', () => {
    mockHook({
      data: {
        data: [makeCampaign()],
        meta: { total: 1, page: 1, limit: 12, totalPages: 1 },
      },
    });
    renderPage();
    expect(screen.getByText('Lançamento Whey')).toBeInTheDocument();
    expect(screen.getByText('Marca Fit')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/apply/camp-1');
  });

  it('paginação: "Anterior" desabilitado na página 1 e avança ao clicar "Próxima"', () => {
    mockHook({
      data: {
        data: [makeCampaign()],
        meta: { total: 30, page: 1, limit: 12, totalPages: 3 },
      },
    });
    renderPage();

    expect(screen.getByRole('button', { name: /anterior/i })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /próxima/i }));

    // ao avançar, o hook é re-chamado com page 2
    expect(hook.useBrowsePrograms).toHaveBeenLastCalledWith(2);
  });
});
