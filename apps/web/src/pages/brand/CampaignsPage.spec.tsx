/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CampaignsPage from './CampaignsPage';
import * as hooks from '../../hooks/useCampaigns';
import { campaignFixture } from '../../test/fixtures/applications';
import type { Campaign, CampaignStatus } from '../../types/api';

const navigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigate };
});

vi.mock('../../hooks/useCampaigns', async (importOriginal) => {
  const actual = await importOriginal<typeof hooks>();
  return { ...actual, useCampaigns: vi.fn() };
});

function makeCampaign(
  id: string,
  status: CampaignStatus,
  overrides: Partial<Campaign> = {},
): Campaign {
  return {
    ...campaignFixture,
    id,
    title: `Programa ${id}`,
    status,
    maxSpots: 10,
    approvedCount: 0,
    pendingCount: 0,
    _count: { applications: 0 },
    ...overrides,
  };
}

function mockCampaigns(
  data: Campaign[] | undefined,
  state: { isLoading?: boolean; isError?: boolean } = {},
) {
  vi.mocked(hooks.useCampaigns).mockReturnValue({
    data,
    isLoading: state.isLoading ?? false,
    isError: state.isError ?? false,
  } as any);
}

function renderPage() {
  return render(
    <MemoryRouter>
      <CampaignsPage />
    </MemoryRouter>,
  );
}

/** A placa em destaque é a única com a barra de ação "Copiar link". */
const placaEmDestaque = () =>
  screen.queryByRole('button', { name: /copiar link/i })?.closest('div')
    ?.parentElement ?? null;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CampaignsPage — estados de carga', () => {
  it('mostra erro quando a listagem falha', () => {
    mockCampaigns(undefined, { isError: true });
    renderPage();

    expect(screen.getByText(/erro ao carregar campanhas/i)).toBeInTheDocument();
  });

  it('não mostra empty state enquanto carrega', () => {
    mockCampaigns(undefined, { isLoading: true });
    renderPage();

    expect(screen.queryByText(/ainda não criou nenhum programa/i)).not.toBeInTheDocument();
  });

  it('convida a criar o primeiro programa quando não há nenhum', () => {
    mockCampaigns([]);
    renderPage();

    expect(screen.getByText(/ainda não criou nenhum programa/i)).toBeInTheDocument();
  });

  it('leva pra criação de programa pelo botão Novo', () => {
    mockCampaigns([]);
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /novo/i }));

    expect(navigate).toHaveBeenCalledWith('/brand/campaigns/new');
  });
});

describe('CampaignsPage — filtro por status', () => {
  const todas = () => [
    makeCampaign('a', 'ACTIVE'),
    makeCampaign('d', 'DRAFT'),
    makeCampaign('c', 'CLOSED'),
  ];

  it('lista todos os programas na aba Todas', () => {
    mockCampaigns(todas());
    renderPage();

    expect(screen.getAllByText('Programa a').length).toBeGreaterThan(0);
    expect(screen.getByText('Programa d')).toBeInTheDocument();
    expect(screen.getByText('Programa c')).toBeInTheDocument();
  });

  it('filtra para rascunhos', () => {
    mockCampaigns(todas());
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Rascunho' }));

    expect(screen.getByText('Programa d')).toBeInTheDocument();
    expect(screen.queryByText('Programa c')).not.toBeInTheDocument();
  });

  it('explica quando o filtro não tem nenhum programa', () => {
    mockCampaigns([makeCampaign('a', 'ACTIVE')]);
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Encerradas' }));

    expect(screen.getByText(/nenhum programa com status "encerradas"/i)).toBeInTheDocument();
  });
});

// Regressão registrada em CLAUDE.md (v0.29.0): a placa vazava pra qualquer
// aba. Ela É um programa ativo — aparecer em "Rascunho"/"Encerradas" faz
// parecer que existe um ativo naquele filtro.
describe('CampaignsPage — placa em destaque', () => {
  const comAtivos = () => [
    makeCampaign('cheio', 'ACTIVE', { approvedCount: 8, maxSpots: 10 }),
    makeCampaign('vazio', 'ACTIVE', { approvedCount: 1, maxSpots: 10 }),
    makeCampaign('rascunho', 'DRAFT'),
  ];

  it('destaca o programa ativo com maior taxa de preenchimento', () => {
    mockCampaigns(comAtivos());
    renderPage();

    const placa = placaEmDestaque();
    expect(placa).not.toBeNull();
    expect(within(placa as HTMLElement).getByText('Programa cheio')).toBeInTheDocument();
  });

  it.each(['Rascunho', 'Encerradas'])(
    'não mostra a placa na aba %s',
    (aba) => {
      mockCampaigns(comAtivos());
      renderPage();

      fireEvent.click(screen.getByRole('button', { name: aba }));

      expect(
        screen.queryByRole('button', { name: /copiar link/i }),
      ).not.toBeInTheDocument();
    },
  );

  it('mostra a placa na aba Ativas', () => {
    mockCampaigns(comAtivos());
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Ativas' }));

    expect(screen.getByRole('button', { name: /copiar link/i })).toBeInTheDocument();
  });

  it('não mostra placa quando não há nenhum programa ativo', () => {
    mockCampaigns([makeCampaign('d', 'DRAFT'), makeCampaign('c', 'CLOSED')]);
    renderPage();

    expect(
      screen.queryByRole('button', { name: /copiar link/i }),
    ).not.toBeInTheDocument();
  });
});
