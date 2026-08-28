/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SubmissionsPage from './SubmissionsPage';
import * as subHooks from '../../hooks/useMySubmissions';
import * as appHooks from '../../hooks/useMyApplications';
import type {
  ApplicationStatus,
  ContentStatus,
  MediaType,
  MyApplication,
  MySubmission,
} from '../../types/api';

vi.mock('../../hooks/useMySubmissions', async (importOriginal) => {
  const actual = await importOriginal<typeof subHooks>();
  return { ...actual, useMySubmissions: vi.fn(), useCreateSubmission: vi.fn() };
});

vi.mock('../../hooks/useMyApplications', async (importOriginal) => {
  const actual = await importOriginal<typeof appHooks>();
  return { ...actual, useMyApplications: vi.fn() };
});

const APP_ID = '11111111-1111-4111-8111-111111111111';

function makeSubmission(id: string, overrides: Partial<MySubmission> = {}): MySubmission {
  return {
    id,
    applicationId: APP_ID,
    mediaUrl: 'https://instagram.com/reel/abc',
    mediaType: 'REEL' as MediaType,
    caption: null,
    status: 'PENDING' as ContentStatus,
    feedback: null,
    submittedAt: '2026-08-20T10:00:00.000Z',
    reviewedAt: null,
    application: {
      campaign: { title: 'Campanha Verão', brand: { name: 'Lilo' } },
    },
    ...overrides,
  };
}

function makeApplication(id = APP_ID, status: ApplicationStatus = 'APPROVED'): MyApplication {
  return {
    id,
    campaignId: 'camp-1',
    status,
    message: null,
    appliedAt: '2026-08-01T10:00:00.000Z',
    reviewedAt: null,
    campaign: {
      title: 'Campanha Verão',
      status: 'ACTIVE',
      deadline: null,
      offerType: 'CASH',
      offerAmount: 30_000,
      offerDeadlineDays: 15,
      offerDescription: null,
      offerCommissionPercent: null,
      brand: { name: 'Lilo', logoUrl: null },
    },
  };
}

let mutateAsync: ReturnType<typeof vi.fn>;

function mockData(
  submissions: MySubmission[] = [],
  applications: MyApplication[] = [makeApplication()],
  state: { isLoading?: boolean; isError?: boolean } = {},
) {
  vi.mocked(subHooks.useMySubmissions).mockReturnValue({
    data: submissions,
    isLoading: state.isLoading ?? false,
    isError: state.isError ?? false,
  } as any);
  vi.mocked(appHooks.useMyApplications).mockReturnValue({
    data: applications,
  } as any);
  vi.mocked(subHooks.useCreateSubmission).mockReturnValue({
    mutateAsync,
    isPending: false,
  } as any);
}

function renderPage(entry = '/influencer/submissions') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <SubmissionsPage />
    </MemoryRouter>,
  );
}

/** O modal está aberto quando os campos do formulário existem — "Enviar
 * conteúdo" é ambíguo (é o título do modal E o rótulo do botão de submit). */
const modalAberto = () => screen.queryByLabelText(/link do conteúdo/i) !== null;

beforeEach(() => {
  mutateAsync = vi.fn().mockResolvedValue({});
  vi.clearAllMocks();
});

describe('SubmissionsPage — estados', () => {
  it('mostra erro quando a listagem falha', () => {
    mockData([], [], { isError: true });
    renderPage();

    expect(screen.getByText(/erro ao carregar/i)).toBeInTheDocument();
  });

  it('explica o pré-requisito quando não há conteúdo enviado', () => {
    mockData([]);
    renderPage();

    expect(screen.getByText(/nenhum conteúdo enviado ainda/i)).toBeInTheDocument();
    expect(screen.getByText(/candidatura aprovada/i)).toBeInTheDocument();
  });

  it('não mostra empty state enquanto carrega', () => {
    mockData([], [], { isLoading: true });
    renderPage();

    expect(screen.queryByText(/nenhum conteúdo enviado ainda/i)).not.toBeInTheDocument();
  });

  it('lista os conteúdos enviados com tipo de mídia', () => {
    mockData([
      makeSubmission('s1', { mediaType: 'REEL' }),
      makeSubmission('s2', { mediaType: 'STORY' }),
    ]);
    renderPage();

    expect(screen.getByText(/^Reel ·/)).toBeInTheDocument();
    expect(screen.getByText(/^Story ·/)).toBeInTheDocument();
  });
});

// A placa é o "o que precisa de você agora". A ordem da cascata importa: se
// uma recusa recente ficasse escondida atrás de uma aprovação, a creator não
// saberia que precisa refazer nada.
describe('SubmissionsPage — placa em destaque (cascata)', () => {
  it('prioriza conteúdo que a marca pediu ajuste, mesmo com aprovado na lista', () => {
    mockData([
      makeSubmission('s1', {
        status: 'REVISION_REQUESTED',
        feedback: 'Troca a legenda',
      }),
      makeSubmission('s2', { status: 'APPROVED' }),
    ]);
    renderPage();

    expect(screen.getByText(/a marca pediu ajuste/i)).toBeInTheDocument();
    expect(screen.getByText(/Troca a legenda/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reenviar link/i })).toBeInTheDocument();
  });

  it('trata conteúdo recusado como ação pendente também', () => {
    mockData([makeSubmission('s1', { status: 'REJECTED' })]);
    renderPage();

    expect(screen.getByRole('button', { name: /reenviar link/i })).toBeInTheDocument();
  });

  it('sem nada a ajustar, destaca o aprovado e convida a enviar mais', () => {
    mockData([
      makeSubmission('s1', { status: 'APPROVED' }),
      makeSubmission('s2', { status: 'PENDING' }),
    ]);
    renderPage();

    expect(screen.getByRole('button', { name: /enviar novo conteúdo/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reenviar link/i })).not.toBeInTheDocument();
  });

  // Só PENDING: não há o que fazer além de esperar — a placa aparece sem ação
  // em vez de sugerir uma que não existe.
  it('com tudo em análise, a placa não oferece ação nenhuma', () => {
    mockData([makeSubmission('s1', { status: 'PENDING' })]);
    renderPage();

    expect(screen.queryByRole('button', { name: /reenviar link/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /enviar novo conteúdo/i })).not.toBeInTheDocument();
  });

  it('só mostra o feedback da marca no modo de ajuste', () => {
    mockData([makeSubmission('s1', { status: 'APPROVED', feedback: 'Ficou ótimo' })]);
    renderPage();

    expect(screen.queryByText(/Ficou ótimo/)).not.toBeInTheDocument();
  });
});

describe('SubmissionsPage — modal de envio', () => {
  it('abre pelo botão Enviar', async () => {
    const user = userEvent.setup();
    mockData([]);
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(modalAberto()).toBe(true);
  });

  // Vem do link "Enviar conteúdo" do card de candidatura aprovada
  // (?apply=<id>): abrir já com a candidatura escolhida é o ponto do atalho.
  it('abre sozinho e pré-seleciona a candidatura quando vem de ?apply=', () => {
    mockData([]);
    renderPage(`/influencer/submissions?apply=${APP_ID}`);

    expect(modalAberto()).toBe(true);
    expect(screen.getByLabelText(/candidatura aprovada/i)).toHaveValue(APP_ID);
  });

  it('só oferece candidaturas APROVADAS no seletor', async () => {
    const user = userEvent.setup();
    mockData(
      [],
      [
        makeApplication(APP_ID, 'APPROVED'),
        makeApplication('22222222-2222-4222-8222-222222222222', 'PENDING'),
      ],
    );
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    const select = screen.getByLabelText(/candidatura aprovada/i);
    // "Selecione…" + a única aprovada
    expect(within(select).getAllByRole('option')).toHaveLength(2);
  });

  // Sem candidatura aprovada não há o que enviar: mostrar o formulário levaria
  // a um 400 garantido do backend.
  it('sem candidatura aprovada, explica em vez de mostrar o formulário', async () => {
    const user = userEvent.setup();
    mockData([], [makeApplication(APP_ID, 'PENDING')]);
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(screen.getByText(/não tem candidaturas aprovadas/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/link do conteúdo/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ver candidaturas/i })).toHaveAttribute(
      'href',
      '/influencer/applications',
    );
  });

  it('fecha no Cancelar', async () => {
    const user = userEvent.setup();
    mockData([]);
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Enviar' }));
    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(modalAberto()).toBe(false);
  });
});

describe('SubmissionsPage — envio', () => {
  async function abrirEPreencher(
    user: ReturnType<typeof userEvent.setup>,
    url = 'https://instagram.com/reel/xyz',
  ) {
    await user.click(screen.getByRole('button', { name: 'Enviar' }));
    await user.selectOptions(screen.getByLabelText(/candidatura aprovada/i), APP_ID);
    await user.type(screen.getByLabelText(/link do conteúdo/i), url);
    await user.click(screen.getByRole('button', { name: /enviar conteúdo/i }));
  }

  it('envia a submission com os dados do formulário', async () => {
    const user = userEvent.setup();
    mockData([]);
    renderPage();

    await abrirEPreencher(user);

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        applicationId: APP_ID,
        mediaUrl: 'https://instagram.com/reel/xyz',
        mediaType: 'REEL',
        caption: undefined,
      }),
    );
  });

  it('fecha o modal após enviar com sucesso', async () => {
    const user = userEvent.setup();
    mockData([]);
    renderPage();

    await abrirEPreencher(user);

    await waitFor(() => expect(modalAberto()).toBe(false));
  });

  it('barra URL inválida antes de chamar a API', async () => {
    const user = userEvent.setup();
    mockData([]);
    renderPage();

    await abrirEPreencher(user, 'instagram.com/sem-protocolo');

    expect(await screen.findByText(/url inválida/i)).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('exige escolher uma candidatura', async () => {
    const user = userEvent.setup();
    mockData([]);
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Enviar' }));
    await user.type(screen.getByLabelText(/link do conteúdo/i), 'https://instagram.com/reel/xyz');
    await user.click(screen.getByRole('button', { name: /enviar conteúdo/i }));

    expect(await screen.findByText(/selecione uma candidatura aprovada/i)).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  // O 400 do backend carrega a regra real ("sua candidatura precisa estar
  // aprovada"): mostrar a mensagem dele é melhor que um genérico nosso.
  it('mostra a mensagem do servidor num 400 e mantém o modal aberto', async () => {
    const user = userEvent.setup();
    mockData([]);
    renderPage();
    mutateAsync.mockRejectedValue({
      isAxiosError: true,
      response: { status: 400, data: { message: 'Candidatura precisa estar aprovada' } },
    });

    await abrirEPreencher(user);

    expect(await screen.findByText(/candidatura precisa estar aprovada/i)).toBeInTheDocument();
    expect(modalAberto()).toBe(true);
  });

  it('explica o 403 com texto próprio', async () => {
    const user = userEvent.setup();
    mockData([]);
    renderPage();
    mutateAsync.mockRejectedValue({
      isAxiosError: true,
      response: { status: 403, data: {} },
    });

    await abrirEPreencher(user);

    expect(await screen.findByText(/não é sua ou não está aprovada/i)).toBeInTheDocument();
  });

  it('cai num erro genérico quando a resposta não é reconhecida', async () => {
    const user = userEvent.setup();
    mockData([]);
    renderPage();
    mutateAsync.mockRejectedValue(new Error('network down'));

    await abrirEPreencher(user);

    expect(await screen.findByText(/não foi possível enviar/i)).toBeInTheDocument();
  });
});
