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
    {
      applicationId: 'app-2',
      campaignId: 'camp-1',
      campaignTitle: 'Campanha Verão',
      reviewedAt: '2026-08-20T10:00:00.000Z',
    },
    {
      applicationId: 'app-3',
      campaignId: 'camp-2',
      campaignTitle: 'Campanha Inverno',
      reviewedAt: '2026-08-25T10:00:00.000Z',
    },
  ],
};

function mockHook(
  overrides: Partial<{ data: ApprovedCreator[]; isLoading: boolean; isError: boolean }> = {},
) {
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
  it('mostra empty state quando nenhuma candidatura foi aprovada ainda', () => {
    render(<ApprovedCreatorsPage />);
    expect(screen.getByText(/nenhuma candidatura aprovada ainda/i)).toBeInTheDocument();
  });

  // Regressão de copy: a tela dizia "Todas as creators já aprovadas",
  // "Nenhuma creator aprovada", "Creators aprovadas" — todas assumindo o
  // gênero de quem se candidatou. A concordância tem que ser com a palavra
  // CANDIDATURA, nunca com a pessoa (regra do CLAUDE.md).
  it('não usa copy que assume o gênero de quem se candidatou', () => {
    mockHook({ data: [ana, bia] });
    const { container } = render(<ApprovedCreatorsPage />);

    expect(container.textContent).not.toMatch(/creators? (já )?aprovadas?/i);
    expect(container.textContent).not.toMatch(/aprovada em \d+ campanha/i);
  });

  // Regressão: o rótulo mono da lista dizia "Creators · N" logo abaixo do
  // <h1> "Creators" — no celular a lista fica na mesma dobra do título e a
  // palavra aparecia duas vezes. A contagem subiu pro título.
  it('não repete a palavra "Creators" na tela', () => {
    mockHook({ data: [ana, bia] });
    const { container } = render(<ApprovedCreatorsPage />);

    expect(container.textContent?.match(/creators/gi) ?? []).toHaveLength(1);
    expect(screen.getByText('· 2')).toBeInTheDocument();
  });

  it('mostra erro ao falhar o carregamento', () => {
    mockHook({ isError: true });
    render(<ApprovedCreatorsPage />);
    expect(screen.getByText(/erro ao carregar/i)).toBeInTheDocument();
  });

  it('lista as creators e abre a primeira na placa', () => {
    mockHook({ data: [ana, bia] });
    render(<ApprovedCreatorsPage />);

    const lista = within(screen.getByRole('list', { name: 'Creators com candidatura aprovada' }));
    expect(lista.getByText('Ana Creator')).toBeInTheDocument();
    expect(lista.getByText('Bia Creator')).toBeInTheDocument();

    // Placa da primeira (Ana) já vem aberta.
    expect(screen.getByText('@ana.creator')).toBeInTheDocument();
  });

  it('mostra quantas candidaturas aprovadas cada creator tem', () => {
    mockHook({ data: [ana, bia] });
    render(<ApprovedCreatorsPage />);

    const lista = within(screen.getByRole('list', { name: 'Creators com candidatura aprovada' }));
    expect(lista.getByText('1 candidatura aprovada')).toBeInTheDocument();
    expect(lista.getByText('2 candidaturas aprovadas')).toBeInTheDocument();
  });

  // Regressão: a placa mostrava `followersCount` cru. Uma conta de milhões
  // renderizava "5400000" em display 36px e saía cortada da meia placa.
  it('mostra seguidores no formato compacto', () => {
    mockHook({
      data: [{ ...ana, influencer: { ...ana.influencer, followersCount: 5_400_000 } }],
    });
    render(<ApprovedCreatorsPage />);

    expect(screen.getByText('5,4M')).toBeInTheDocument();
    expect(screen.queryByText('5400000')).not.toBeInTheDocument();
  });

  it('mostra o telefone da creator como link tel: na placa', () => {
    mockHook({ data: [ana] });
    render(<ApprovedCreatorsPage />);

    expect(screen.getByRole('link', { name: '(11) 91234-5678' })).toHaveAttribute(
      'href',
      'tel:(11) 91234-5678',
    );
  });

  // Sem telefone não há botão de WhatsApp — e a placa precisa dizer POR QUÊ,
  // senão a ausência do botão parece defeito da tela.
  it('diz que o telefone não foi informado quando não há telefone', () => {
    mockHook({ data: [bia] });
    render(<ApprovedCreatorsPage />);

    expect(screen.getByText('Telefone não informado')).toBeInTheDocument();
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

  it('não mostra botão de WhatsApp quando não há telefone', () => {
    mockHook({ data: [bia] });
    render(<ApprovedCreatorsPage />);

    expect(screen.queryByRole('link', { name: /whatsapp/i })).not.toBeInTheDocument();
  });
});
