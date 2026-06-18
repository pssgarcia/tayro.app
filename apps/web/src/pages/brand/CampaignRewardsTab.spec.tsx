/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CampaignRewardsTab from './CampaignRewardsTab';
import * as hooks from '../../hooks/useCampaignApplications';
import type { CampaignReward } from '../../types/api';

vi.mock('../../hooks/useCampaignApplications', async (importOriginal) => {
  const actual = await importOriginal<typeof hooks>();
  return {
    ...actual,
    useCampaignRewards: vi.fn(),
    useCreateReward: vi.fn(),
    useMarkRewardIssued: vi.fn(),
    useMarkRewardDelivered: vi.fn(),
    useApplications: vi.fn(),
  };
});

const baseReward: CampaignReward = {
  id: 'rew-1',
  influencerId: 'inf-1',
  campaignId: 'camp-1',
  type: 'MONETARY',
  value: 'R$300,00',
  status: 'PENDING',
  notes: null,
  issuedAt: null,
  createdAt: '2026-06-10T10:00:00.000Z',
  influencer: {
    name: 'Ana Creator',
    instagramHandle: 'ana.creator',
    avatarUrl: null,
  },
};

function mockHooks(rewards: CampaignReward[] = [], approvedCount = 0) {
  const noop = { mutate: vi.fn(), isPending: false, variables: undefined };
  vi.mocked(hooks.useCampaignRewards).mockReturnValue({ data: rewards, isLoading: false } as any);
  vi.mocked(hooks.useCreateReward).mockReturnValue(noop as any);
  vi.mocked(hooks.useMarkRewardIssued).mockReturnValue(noop as any);
  vi.mocked(hooks.useMarkRewardDelivered).mockReturnValue(noop as any);
  vi.mocked(hooks.useApplications).mockReturnValue({
    data: Array.from({ length: approvedCount }, (_, i) => ({
      id: `app-${i}`,
      influencerId: `inf-${i}`,
      status: 'APPROVED',
      influencer: { name: `Creator ${i}` },
    })),
    isLoading: false,
  } as any);
}

beforeEach(() => {
  mockHooks();
});

describe('CampaignRewardsTab', () => {
  it('mostra empty state quando não há recompensas', () => {
    render(<CampaignRewardsTab campaignId="camp-1" />);
    expect(screen.getByText(/nenhuma recompensa registrada/i)).toBeInTheDocument();
  });

  it('renderiza card com nome da creator, tipo e valor', () => {
    mockHooks([baseReward]);
    render(<CampaignRewardsTab campaignId="camp-1" />);
    expect(screen.getByText('Ana Creator')).toBeInTheDocument();
    expect(screen.getByText('@ana.creator')).toBeInTheDocument();
    expect(screen.getByText('R$300,00')).toBeInTheDocument();
    expect(screen.getByText('Monetária')).toBeInTheDocument();
    // "Pendente" aparece no filtro e no badge do card
    expect(screen.getAllByText('Pendente').length).toBeGreaterThanOrEqual(1);
  });

  it('mostra botão "Emitida" apenas para PENDING', () => {
    mockHooks([baseReward]);
    render(<CampaignRewardsTab campaignId="camp-1" />);
    expect(screen.getByRole('button', { name: /marcar como emitida/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /confirmar entrega/i })).not.toBeInTheDocument();
  });

  it('mostra botão "Confirmar entrega" apenas para ISSUED', () => {
    mockHooks([{ ...baseReward, status: 'ISSUED' }]);
    render(<CampaignRewardsTab campaignId="camp-1" />);
    expect(screen.getByRole('button', { name: /confirmar entrega/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /marcar como emitida/i })).not.toBeInTheDocument();
  });

  it('não mostra ações para DELIVERED', () => {
    mockHooks([{ ...baseReward, status: 'DELIVERED' }]);
    render(<CampaignRewardsTab campaignId="camp-1" />);
    expect(screen.queryByRole('button', { name: /marcar como emitida/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /confirmar entrega/i })).not.toBeInTheDocument();
  });

  it('mostra botão "Registrar recompensa" quando há creators aprovadas', () => {
    mockHooks([], 2);
    render(<CampaignRewardsTab campaignId="camp-1" />);
    expect(screen.getByRole('button', { name: /registrar recompensa/i })).toBeInTheDocument();
  });

  it('abre modal de criação ao clicar em "Registrar recompensa"', () => {
    mockHooks([], 1);
    render(<CampaignRewardsTab campaignId="camp-1" />);
    fireEvent.click(screen.getByRole('button', { name: /registrar recompensa/i }));
    expect(screen.getByText(/registrar recompensa/i, { selector: 'h3' })).toBeInTheDocument();
  });

  it('filtra recompensas por status', () => {
    const issued: CampaignReward = { ...baseReward, id: 'rew-2', status: 'ISSUED' };
    mockHooks([baseReward, issued]);
    render(<CampaignRewardsTab campaignId="camp-1" />);

    expect(screen.getAllByText('Ana Creator')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: /^emitida$/i }));
    expect(screen.getAllByText('Ana Creator')).toHaveLength(1);
    // "Emitida" aparece no filtro ativo e no badge do card
    expect(screen.getAllByText('Emitida').length).toBeGreaterThanOrEqual(1);
  });
});
