/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BrowseProgramsPage from './BrowseProgramsPage';
import * as hook from '../../hooks/useBrowsePrograms';
import type { Campaign, Paginated } from '../../types/api';

// Loading/erro/vazio/paginação/hrefBuilder já são cobertos em ProgramsList.spec.tsx
// (ProgramsList é o componente compartilhado com /programs). Aqui só a fiação:
// título certo e o link default (autenticado).
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

function mockHook(data: Paginated<Campaign>) {
  vi.mocked(hook.useBrowsePrograms).mockReturnValue({
    data,
    isLoading: false,
    isError: false,
    isPlaceholderData: false,
  } as any);
}

beforeEach(() => {
  vi.mocked(hook.useBrowsePrograms).mockReset();
});

describe('BrowseProgramsPage', () => {
  it('título "Abertos" e card leva pro detalhe autenticado', () => {
    mockHook({
      data: [makeCampaign()],
      meta: { total: 1, page: 1, limit: 12, totalPages: 1 },
    });

    render(
      <MemoryRouter>
        <BrowseProgramsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Abertos')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ver programa/i })).toHaveAttribute(
      'href',
      '/influencer/programs/camp-1',
    );
  });
});
