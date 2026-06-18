/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardPage from './DashboardPage';
import * as hook from '../../hooks/useDashboard';
import type { BrandDashboard } from '../../types/api';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('../../hooks/useDashboard', () => ({
  useDashboard: vi.fn(),
  dashboardKeys: { brand: ['dashboard', 'brand'] },
}));

const baseData: BrandDashboard = {
  campaigns: { total: 6, active: 3, draft: 2, closed: 1, completed: 0 },
  applications: { total: 10, pending: 5, approved: 4, rejected: 1 },
  content: { pendingReview: 7 },
  rewards: { total: 8, pending: 2, issued: 3, delivered: 3 },
};

function mockDashboard(over: Partial<{ data: BrandDashboard; isLoading: boolean; isError: boolean }> = {}) {
  vi.mocked(hook.useDashboard).mockReturnValue({
    data: baseData,
    isLoading: false,
    isError: false,
    ...over,
  } as any);
}

function renderPage() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  navigateMock.mockClear();
  mockDashboard();
});

describe('DashboardPage', () => {
  it('mostra skeleton enquanto carrega', () => {
    mockDashboard({ isLoading: true });
    const { container } = renderPage();
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('mostra mensagem de erro em isError', () => {
    mockDashboard({ isError: true, isLoading: false });
    renderPage();
    expect(screen.getByText(/erro ao carregar o dashboard/i)).toBeInTheDocument();
  });

  it('renderiza as métricas principais', () => {
    renderPage();
    // total de programas
    expect(screen.getByText('6')).toBeInTheDocument();
    // hint de programas
    expect(screen.getByText(/3 ativos · 2 rascunho/i)).toBeInTheDocument();
    // candidaturas aprovadas no hint
    expect(screen.getByText(/4 aprovadas/i)).toBeInTheDocument();
  });

  it('mostra os cards de "precisa de atenção" quando há pendências', () => {
    renderPage();
    expect(screen.getByText(/candidaturas aguardando análise/i)).toBeInTheDocument();
    expect(screen.getByText(/conteúdos aguardando revisão/i)).toBeInTheDocument();
    expect(screen.getByText(/recompensas pendentes de emissão/i)).toBeInTheDocument();
  });

  it('não mostra "precisa de atenção" quando não há pendências', () => {
    mockDashboard({
      data: {
        ...baseData,
        applications: { total: 4, pending: 0, approved: 4, rejected: 0 },
        content: { pendingReview: 0 },
        rewards: { total: 3, pending: 0, issued: 0, delivered: 3 },
      },
    });
    renderPage();
    expect(screen.queryByText(/precisa de atenção/i)).not.toBeInTheDocument();
  });

  it('clicar num card de atenção navega para os programas', () => {
    renderPage();
    fireEvent.click(screen.getByText(/candidaturas aguardando análise/i));
    expect(navigateMock).toHaveBeenCalledWith('/brand/campaigns');
  });

  it('mostra CTA de criar programa quando não há campanhas', () => {
    mockDashboard({
      data: {
        campaigns: { total: 0, active: 0, draft: 0, closed: 0, completed: 0 },
        applications: { total: 0, pending: 0, approved: 0, rejected: 0 },
        content: { pendingReview: 0 },
        rewards: { total: 0, pending: 0, issued: 0, delivered: 0 },
      },
    });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /criar programa/i }));
    expect(navigateMock).toHaveBeenCalledWith('/brand/campaigns/new');
  });
});
