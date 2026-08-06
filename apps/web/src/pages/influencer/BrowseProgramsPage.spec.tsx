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

  it('renderiza o primeiro programa como placa em destaque, linkando pro detalhe', () => {
    mockHook({
      data: {
        data: [makeCampaign()],
        meta: { total: 1, page: 1, limit: 12, totalPages: 1 },
      },
    });
    renderPage();
    expect(screen.getByText('Lançamento Whey')).toBeInTheDocument();
    expect(screen.getByText('Marca Fit')).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /ver programa/i })).toHaveAttribute(
      'href',
      '/influencer/programs/camp-1',
    );
    // candidatura não sai mais da lista — só do detalhe
    expect(screen.queryByText('Quero participar')).not.toBeInTheDocument();
  });

  it('programas além do primeiro aparecem como rows em "Todos os abertos"', () => {
    mockHook({
      data: {
        data: [makeCampaign(), makeCampaign({ id: 'camp-2', title: 'Segundo Programa' })],
        meta: { total: 2, page: 1, limit: 12, totalPages: 1 },
      },
    });
    renderPage();
    expect(screen.getByText('Todos os abertos')).toBeInTheDocument();
    expect(screen.getByText('Segundo Programa')).toBeInTheDocument();
  });

  it('pager de traços: avança de página ao clicar num traço', () => {
    mockHook({
      data: {
        data: [makeCampaign()],
        meta: { total: 30, page: 1, limit: 12, totalPages: 3 },
      },
    });
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /página 2 de 3/i }));

    // ao avançar, o hook é re-chamado com page 2
    expect(hook.useBrowsePrograms).toHaveBeenLastCalledWith(2);
  });
});
