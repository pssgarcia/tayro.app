/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BrowseProgramsPublicPage from './BrowseProgramsPublicPage';
import * as hook from '../../hooks/useBrowsePrograms';
import { useAuthStore } from '../../stores/auth.store';
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
      <BrowseProgramsPublicPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(hook.useBrowsePrograms).mockReset();
  useAuthStore.setState({ accessToken: null, user: null, isInitialized: true });
});

describe('BrowseProgramsPublicPage', () => {
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

  it('visitante sem conta: card leva para /apply/:id, não para o fluxo autenticado', () => {
    mockHook({
      data: {
        data: [makeCampaign()],
        meta: { total: 1, page: 1, limit: 12, totalPages: 1 },
      },
    });
    renderPage();

    expect(screen.getByRole('link', { name: /ver programa/i })).toHaveAttribute(
      'href',
      '/apply/camp-1',
    );
  });

  it('creator já logada: card leva para o detalhe autenticado (respeita candidatura existente)', () => {
    useAuthStore.setState({
      accessToken: 'tok-123',
      user: { id: 'u1', email: 'bia@example.com', role: 'INFLUENCER' },
      isInitialized: true,
    });
    mockHook({
      data: {
        data: [makeCampaign()],
        meta: { total: 1, page: 1, limit: 12, totalPages: 1 },
      },
    });
    renderPage();

    expect(screen.getByRole('link', { name: /ver programa/i })).toHaveAttribute(
      'href',
      '/influencer/programs/camp-1',
    );
  });

  it('link do cabeçalho leva ao login', () => {
    mockHook({ isLoading: true });
    renderPage();
    expect(screen.getByRole('link', { name: /tayro/i })).toHaveAttribute('href', '/login');
  });
});
