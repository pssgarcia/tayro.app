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

  it('renderiza o Resumo com as métricas principais', () => {
    renderPage();
    expect(screen.getByText(/3 ativos/i)).toBeInTheDocument();
    expect(screen.getByText(/4 fechadas/i)).toBeInTheDocument();
    expect(screen.getByText('conteúdos a revisar')).toBeInTheDocument();
    expect(screen.getByText(/3 entregues/i)).toBeInTheDocument();
  });

  it('candidaturas pendentes > 0: mostra a placa em destaque com o botão "Analisar agora"', () => {
    renderPage();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText(/esperando sua análise/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /analisar agora/i })).toBeInTheDocument();
  });

  it('sem candidaturas pendentes: não mostra a placa em destaque', () => {
    mockDashboard({
      data: {
        ...baseData,
        applications: { total: 4, pending: 0, approved: 4, rejected: 0 },
      },
    });
    renderPage();
    expect(screen.queryByRole('button', { name: /analisar agora/i })).not.toBeInTheDocument();
    // o Resumo continua aparecendo — os números não têm ação, só leitura
    expect(screen.getByText('conteúdos a revisar')).toBeInTheDocument();
  });

  it('clicar em "Analisar agora" navega para os programas', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /analisar agora/i }));
    expect(navigateMock).toHaveBeenCalledWith('/brand/campaigns');
  });

  it('sem programas: a placa vira convite com "Criar o primeiro"', () => {
    mockDashboard({
      data: {
        campaigns: { total: 0, active: 0, draft: 0, closed: 0, completed: 0 },
        applications: { total: 0, pending: 0, approved: 0, rejected: 0 },
        content: { pendingReview: 0 },
        rewards: { total: 0, pending: 0, issued: 0, delivered: 0 },
      },
    });
    renderPage();
    expect(screen.getByText(/nenhum programa ainda/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /criar o primeiro/i }));
    expect(navigateMock).toHaveBeenCalledWith('/brand/campaigns/new');
  });
});
