/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardPage from './DashboardPage';
import * as appHooks from '../../hooks/useMyApplications';
import * as rewardHooks from '../../hooks/useMyRewards';
import type {
  ApplicationStatus,
  MyApplication,
  MyReward,
  RewardStatus,
} from '../../types/api';

vi.mock('../../hooks/useMyApplications', async (importOriginal) => {
  const actual = await importOriginal<typeof appHooks>();
  return { ...actual, useMyApplications: vi.fn() };
});

vi.mock('../../hooks/useMyRewards', async (importOriginal) => {
  const actual = await importOriginal<typeof rewardHooks>();
  return { ...actual, useMyRewards: vi.fn() };
});

function makeApp(id: string, status: ApplicationStatus): MyApplication {
  return {
    id,
    campaignId: `camp-${id}`,
    status,
    message: null,
    appliedAt: '2026-08-20T10:00:00.000Z',
    reviewedAt: null,
    campaign: {
      title: `Programa ${id}`,
      status: 'ACTIVE',
      deadline: null,
      offerType: 'CASH',
      offerAmount: 30_000,
      offerDeadlineDays: 15,
      offerDescription: null,
      offerCommissionPercent: null,
      brand: { name: `Marca ${id}`, logoUrl: null },
    },
  };
}

function makeReward(id: string, status: RewardStatus): MyReward {
  return {
    id,
    type: 'MONETARY',
    value: 'R$300',
    status,
    notes: null,
    issuedAt: null,
    createdAt: '2026-08-01T10:00:00.000Z',
    campaign: { title: 'Campanha', brand: { name: 'Lilo' } },
  };
}

function mockData(
  applications: MyApplication[],
  rewards: MyReward[] = [],
  state: { appsLoading?: boolean; rewardsLoading?: boolean } = {},
) {
  vi.mocked(appHooks.useMyApplications).mockReturnValue({
    data: applications,
    isLoading: state.appsLoading ?? false,
  } as any);
  vi.mocked(rewardHooks.useMyRewards).mockReturnValue({
    data: rewards,
    isLoading: state.rewardsLoading ?? false,
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
  vi.clearAllMocks();
});

describe('DashboardPage — carregamento', () => {
  // Duas queries alimentam a tela: mostrar metade dos números enquanto a outra
  // ainda carrega daria uma taxa de conversão errada por um instante.
  it.each([
    ['candidaturas', { appsLoading: true }],
    ['recompensas', { rewardsLoading: true }],
  ])('mostra skeleton enquanto %s carrega', (_nome, state) => {
    mockData([], [], state);
    renderPage();

    expect(screen.queryByText(/nenhuma candidatura ainda/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Registro')).not.toBeInTheDocument();
  });
});

describe('DashboardPage — taxa de conversão', () => {
  it('sem candidatura nenhuma, não inventa taxa', () => {
    mockData([]);
    renderPage();

    expect(screen.getAllByText(/nenhuma candidatura ainda/i).length).toBeGreaterThan(0);
    expect(screen.queryByText('%')).not.toBeInTheDocument();
  });

  it('calcula a porcentagem de candidaturas que viraram parceria', () => {
    mockData([
      makeApp('a', 'APPROVED'),
      makeApp('b', 'APPROVED'),
      makeApp('c', 'REJECTED'),
      makeApp('d', 'PENDING'),
    ]);
    renderPage();

    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText(/2 das suas 4 candidaturas viraram parceria/i)).toBeInTheDocument();
  });

  it('arredonda a taxa em vez de mostrar decimal', () => {
    mockData([
      makeApp('a', 'APPROVED'),
      makeApp('b', 'PENDING'),
      makeApp('c', 'PENDING'),
    ]);
    renderPage();

    expect(screen.getByText('33')).toBeInTheDocument();
  });
});

describe('DashboardPage — resumo lateral', () => {
  it('conta candidaturas em análise', () => {
    mockData([
      makeApp('a', 'PENDING'),
      makeApp('b', 'PENDING'),
      makeApp('c', 'APPROVED'),
    ]);
    renderPage();

    expect(screen.getByText('em análise').previousElementSibling).toHaveTextContent('2');
  });

  // "A receber" inclui ISSUED: da ótica da creator, o que já saiu mas não
  // chegou ainda continua sendo algo que ela tem a receber.
  it('conta como "a receber" tudo que não foi entregue', () => {
    mockData(
      [makeApp('a', 'APPROVED')],
      [
        makeReward('r1', 'PENDING'),
        makeReward('r2', 'ISSUED'),
        makeReward('r3', 'DELIVERED'),
      ],
    );
    renderPage();

    expect(screen.getByText('a receber').previousElementSibling).toHaveTextContent('2');
  });

  it('leva pra tela de recompensas ao clicar no bloco "a receber"', () => {
    mockData([makeApp('a', 'APPROVED')], [makeReward('r1', 'PENDING')]);
    renderPage();

    expect(screen.getByRole('link', { name: /a receber/i })).toHaveAttribute(
      'href',
      '/influencer/rewards',
    );
  });
});

describe('DashboardPage — registro de candidaturas', () => {
  it('mostra só as 3 candidaturas mais recentes', () => {
    mockData([
      makeApp('a', 'PENDING'),
      makeApp('b', 'PENDING'),
      makeApp('c', 'PENDING'),
      makeApp('d', 'PENDING'),
    ]);
    renderPage();

    expect(screen.getByText('Programa a')).toBeInTheDocument();
    expect(screen.getByText('Programa c')).toBeInTheDocument();
    expect(screen.queryByText('Programa d')).not.toBeInTheDocument();
  });

  it('mostra a marca de cada candidatura', () => {
    mockData([makeApp('a', 'PENDING')]);
    renderPage();

    expect(screen.getByText('Marca a')).toBeInTheDocument();
  });

  it('sem candidatura, oferece o caminho pra explorar programas', () => {
    mockData([]);
    renderPage();

    expect(screen.getByRole('link', { name: /explore os programas/i })).toHaveAttribute(
      'href',
      '/influencer/browse',
    );
  });
});
