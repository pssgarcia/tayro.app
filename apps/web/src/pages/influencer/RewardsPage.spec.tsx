/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import RewardsPage from './RewardsPage';
import * as hooks from '../../hooks/useMyRewards';
import type { MyReward, RewardStatus, RewardType } from '../../types/api';

vi.mock('../../hooks/useMyRewards', async (importOriginal) => {
  const actual = await importOriginal<typeof hooks>();
  return { ...actual, useMyRewards: vi.fn() };
});

function makeReward(
  id: string,
  overrides: Partial<MyReward> = {},
): MyReward {
  return {
    id,
    type: 'MONETARY' as RewardType,
    value: 'R$300',
    status: 'PENDING' as RewardStatus,
    notes: null,
    issuedAt: null,
    createdAt: '2026-08-01T10:00:00.000Z',
    campaign: { title: 'Campanha Verão', brand: { name: 'Lilo' } },
    ...overrides,
  };
}

function mockRewards(
  rewards: MyReward[] = [],
  state: { isLoading?: boolean; isError?: boolean } = {},
) {
  vi.mocked(hooks.useMyRewards).mockReturnValue({
    data: rewards,
    isLoading: state.isLoading ?? false,
    isError: state.isError ?? false,
  } as any);
}

/** O resumo do topo — cada pill é número + rótulo. */
const resumo = (rotulo: string) =>
  screen.getByText(rotulo).previousElementSibling;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RewardsPage — estados', () => {
  it('mostra erro quando a listagem falha', () => {
    mockRewards([], { isError: true });
    render(<RewardsPage />);

    expect(screen.getByText(/erro ao carregar/i)).toBeInTheDocument();
  });

  // Empty state é parte do produto: a creator precisa saber que a recompensa
  // aparece quando a MARCA registrar, não por ação dela.
  it('explica de onde vêm as recompensas quando não há nenhuma', () => {
    mockRewards([]);
    render(<RewardsPage />);

    expect(screen.getByText(/nenhuma recompensa ainda/i)).toBeInTheDocument();
    expect(screen.getByText(/após a marca registrá-las/i)).toBeInTheDocument();
  });

  it('não mostra empty state nem resumo enquanto carrega', () => {
    mockRewards([], { isLoading: true });
    render(<RewardsPage />);

    expect(screen.queryByText(/nenhuma recompensa ainda/i)).not.toBeInTheDocument();
    expect(screen.queryByText('a receber')).not.toBeInTheDocument();
  });
});

describe('RewardsPage — conteúdo', () => {
  it('mostra marca, campanha, tipo e valor da recompensa', () => {
    mockRewards([makeReward('r1')]);
    render(<RewardsPage />);

    const item = screen.getByRole('listitem');
    expect(within(item).getByText('Lilo')).toBeInTheDocument();
    expect(within(item).getByText('Campanha Verão')).toBeInTheDocument();
    expect(within(item).getByText('Pagamento')).toBeInTheDocument();
    expect(within(item).getByText('R$300')).toBeInTheDocument();
  });

  it.each([
    ['MONETARY', 'Pagamento'],
    ['PRODUCT', 'Produto'],
    ['DISCOUNT', 'Desconto'],
  ] as const)('rotula o tipo %s como "%s"', (type, label) => {
    mockRewards([makeReward('r1', { type })]);
    render(<RewardsPage />);

    expect(screen.getByText(label)).toBeInTheDocument();
  });

  // O rótulo de status é o que diz à creator se ela precisa esperar ou já
  // recebeu — "PENDING" cru não significaria nada pra ela.
  it.each([
    ['PENDING', 'A receber'],
    ['ISSUED', 'A caminho'],
    ['DELIVERED', 'Entregue'],
  ] as const)('traduz o status %s para "%s"', (status, label) => {
    mockRewards([makeReward('r1', { status })]);
    render(<RewardsPage />);

    expect(within(screen.getByRole('listitem')).getByText(label)).toBeInTheDocument();
  });

  it('mostra as notas da marca quando existem', () => {
    mockRewards([makeReward('r1', { notes: 'Pix enviado dia 10' })]);
    render(<RewardsPage />);

    expect(screen.getByText('Pix enviado dia 10')).toBeInTheDocument();
  });

  it('só mostra data de emissão depois de emitida', () => {
    mockRewards([makeReward('r1')]);
    const { unmount } = render(<RewardsPage />);
    expect(screen.queryByText(/emitido em/i)).not.toBeInTheDocument();
    unmount();

    mockRewards([
      makeReward('r1', {
        status: 'ISSUED',
        issuedAt: '2026-08-10T10:00:00.000Z',
      }),
    ]);
    render(<RewardsPage />);
    expect(screen.getByText(/emitido em/i)).toBeInTheDocument();
  });
});

describe('RewardsPage — resumo', () => {
  it('conta as recompensas por status', () => {
    mockRewards([
      makeReward('r1', { status: 'PENDING' }),
      makeReward('r2', { status: 'PENDING' }),
      makeReward('r3', { status: 'ISSUED' }),
      makeReward('r4', { status: 'DELIVERED' }),
    ]);
    render(<RewardsPage />);

    expect(resumo('a receber')).toHaveTextContent('2');
    expect(resumo('a caminho')).toHaveTextContent('1');
    expect(resumo('entregues')).toHaveTextContent('1');
  });

  it('lista todas as recompensas recebidas', () => {
    mockRewards([makeReward('r1'), makeReward('r2'), makeReward('r3')]);
    render(<RewardsPage />);

    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });
});
