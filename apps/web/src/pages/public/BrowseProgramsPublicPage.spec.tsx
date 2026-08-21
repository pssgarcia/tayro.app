/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BrowseProgramsPublicPage from './BrowseProgramsPublicPage';
import * as hook from '../../hooks/useBrowsePrograms';
import { useAuthStore } from '../../stores/auth.store';
import type { Campaign, Paginated } from '../../types/api';

// Loading/erro/vazio/paginação já são cobertos em ProgramsList.spec.tsx
// (componente compartilhado com /influencer/browse). Aqui só o que é
// específico desta página: header público e o hrefBuilder condicionado ao
// estado de autenticação.
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
    offerCommissionPercent: null,
    deadline: '2026-07-01T00:00:00.000Z',
    createdAt: '2026-06-01T00:00:00.000Z',
    brand: { name: 'Marca Fit', logoUrl: null, website: null },
    _count: { applications: 2 },
    ...over,
  };
}

function mockHook(data: Paginated<Campaign>) {
  vi.mocked(hook.useBrowsePrograms).mockReturnValue({
    data,
    isLoading: false,
    isError: false,
    isPlaceholderData: false,
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
  it('visitante sem conta: card leva para /apply/:id, não para o fluxo autenticado', () => {
    mockHook({
      data: [makeCampaign()],
      meta: { total: 1, page: 1, limit: 12, totalPages: 1 },
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
      data: [makeCampaign()],
      meta: { total: 1, page: 1, limit: 12, totalPages: 1 },
    });
    renderPage();

    expect(screen.getByRole('link', { name: /ver programa/i })).toHaveAttribute(
      'href',
      '/influencer/programs/camp-1',
    );
  });

  it('marca autenticada também vai pro /apply/:id (não pode se candidatar mesmo)', () => {
    useAuthStore.setState({
      accessToken: 'tok-456',
      user: { id: 'u2', email: 'marca@example.com', role: 'BRAND' },
      isInitialized: true,
    });
    mockHook({
      data: [makeCampaign()],
      meta: { total: 1, page: 1, limit: 12, totalPages: 1 },
    });
    renderPage();

    expect(screen.getByRole('link', { name: /ver programa/i })).toHaveAttribute(
      'href',
      '/apply/camp-1',
    );
  });

  it('link do cabeçalho leva ao login', () => {
    mockHook({
      data: [],
      meta: { total: 0, page: 1, limit: 12, totalPages: 0 },
    });
    renderPage();
    expect(screen.getByRole('link', { name: /tayro/i })).toHaveAttribute('href', '/login');
  });
});
