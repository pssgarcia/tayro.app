/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import ApprovedCreatorsPage from './ApprovedCreatorsPage';
import * as hooks from '../../hooks/useApprovedCreators';
import type { ApprovedCreator } from '../../types/api';

vi.mock('../../hooks/useApprovedCreators', async (importOriginal) => {
  const actual = await importOriginal<typeof hooks>();
  return { ...actual, useApprovedCreators: vi.fn() };
});

const ana: ApprovedCreator = {
  influencer: {
    id: 'inf-1',
    name: 'Ana Creator',
    avatarUrl: null,
    phone: '(11) 91234-5678',
    instagramHandle: 'ana.creator',
    niches: [],
    city: null,
    followersCount: 8200,
    igEngagementRate: 4.5,
    igRecentPosts: null,
    igProfilePicUrl: null,
    igFetchStatus: 'OK',
  },
  approvals: [
    {
      applicationId: 'app-1',
      campaignId: 'camp-1',
      campaignTitle: 'Campanha Verão',
      reviewedAt: '2026-09-01T10:00:00.000Z',
    },
  ],
};

const bia: ApprovedCreator = {
  ...ana,
  influencer: { ...ana.influencer, id: 'inf-2', name: 'Bia Creator', phone: null },
  approvals: [
    { applicationId: 'app-2', campaignId: 'camp-1', campaignTitle: 'Campanha Verão', reviewedAt: '2026-08-20T10:00:00.000Z' },
    { applicationId: 'app-3', campaignId: 'camp-2', campaignTitle: 'Campanha Inverno', reviewedAt: '2026-08-25T10:00:00.000Z' },
  ],
};

function mockHook(overrides: Partial<{ data: ApprovedCreator[]; isLoading: boolean; isError: boolean }> = {}) {
  vi.mocked(hooks.useApprovedCreators).mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    ...overrides,
  } as any);
}

beforeEach(() => {
  mockHook();
});

describe('ApprovedCreatorsPage', () => {
  it('mostra empty state quando nenhuma creator foi aprovada ainda', () => {
    render(<ApprovedCreatorsPage />);
    expect(screen.getByText(/nenhuma creator aprovada ainda/i)).toBeInTheDocument();
  });

  it('mostra erro ao falhar o carregamento', () => {
    mockHook({ isError: true });
    render(<ApprovedCreatorsPage />);
    expect(screen.getByText(/erro ao carregar/i)).toBeInTheDocument();
  });

  it('lista as creators e abre a primeira na placa', () => {
    mockHook({ data: [ana, bia] });
    render(<ApprovedCreatorsPage />);

    const lista = within(screen.getByRole('list', { name: 'Creators aprovadas' }));
    expect(lista.getByText('Ana Creator')).toBeInTheDocument();
    expect(lista.getByText('Bia Creator')).toBeInTheDocument();

    // Placa da primeira (Ana) já vem aberta.
    expect(screen.getByText('@ana.creator')).toBeInTheDocument();
  });

  it('mostra em quantas campanhas cada creator foi aprovada', () => {
    mockHook({ data: [ana, bia] });
    render(<ApprovedCreatorsPage />);

    const lista = within(screen.getByRole('list', { name: 'Creators aprovadas' }));
    expect(lista.getByText(/1 campanha$/i)).toBeInTheDocument();
    expect(lista.getByText(/2 campanhas/i)).toBeInTheDocument();
  });

  it('clicar numa linha troca a creator exibida na placa', () => {
    mockHook({ data: [ana, bia] });
    render(<ApprovedCreatorsPage />);

    fireEvent.click(screen.getByText('Bia Creator'));

    expect(screen.getAllByText('Bia Creator').length).toBeGreaterThan(1); // linha + placa
  });

  it('botão de WhatsApp aparece com o link certo quando o telefone é válido', () => {
    mockHook({ data: [ana] });
    render(<ApprovedCreatorsPage />);

    const link = screen.getByRole('link', { name: /whatsapp/i });
    expect(link).toHaveAttribute('href', 'https://wa.me/5511912345678');
  });

  it('não mostra botão de WhatsApp quando a creator não tem telefone', () => {
    mockHook({ data: [bia] });
    render(<ApprovedCreatorsPage />);

    expect(screen.queryByRole('link', { name: /whatsapp/i })).not.toBeInTheDocument();
  });
});
