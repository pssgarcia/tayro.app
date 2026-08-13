/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CampaignDetailPage from './CampaignDetailPage';
import * as hooks from '../../hooks/useCampaignApplications';
import * as campaignHooks from '../../hooks/useCampaigns';
import { api } from '../../services/api';
import type { Application, Campaign } from '../../types/api';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useParams: () => ({ id: 'camp-1' }), useNavigate: () => navigateMock };
});

vi.mock('../../services/api', () => ({ api: { get: vi.fn() } }));

vi.mock('../../hooks/useCampaignApplications', async (importOriginal) => {
  const actual = await importOriginal<typeof hooks>();
  return {
    ...actual,
    useCampaign: vi.fn(),
    useApproveApplication: vi.fn(),
    useRejectApplication: vi.fn(),
    useRefreshApplicationIg: vi.fn(),
  };
});

vi.mock('../../hooks/useCampaigns', () => ({
  useCloseCampaign: vi.fn(),
  useDeleteCampaign: vi.fn(),
  usePublishCampaign: vi.fn(),
}));

const campaign: Campaign = {
  id: 'camp-1',
  title: 'Basic Drop QA',
  description: 'Descrição',
  briefUrl: null,
  status: 'ACTIVE',
  niches: ['fitness'],
  maxSpots: 10,
  deadline: null,
  offerType: 'CASH',
  offerAmount: 30000,
  offerDeadlineDays: 30,
  offerDescription: null,
  createdAt: '2026-06-01T00:00:00.000Z',
  _count: { applications: 0 },
} as any;

function makeApplication(i: number, overrides: Partial<Application> = {}): Application {
  return {
    id: `app-${i}`,
    campaignId: 'camp-1',
    influencerId: `inf-${i}`,
    status: 'PENDING',
    message: null,
    appliedAt: '2026-06-10T10:00:00.000Z',
    reviewedAt: null,
    influencer: {
      id: `inf-${i}`,
      name: `Creator ${i}`,
      avatarUrl: null,
      instagramHandle: `creator${i}`,
      niches: [],
      city: null,
      followersCount: 1000 * i,
      igEngagementRate: 4.2,
      igRecentPosts: null,
      igProfilePicUrl: null,
      igFetchStatus: 'OK',
    },
    _count: { submissions: 0 },
    ...overrides,
  };
}

const noopMutation = { mutate: vi.fn(), isPending: false, variables: undefined, error: null };

function renderPage(
  applications: Application[],
  campaignOverrides: Partial<Campaign> = {},
  mutationOverrides: { close?: any; delete?: any; publish?: any } = {},
) {
  vi.mocked(api.get).mockResolvedValue({ data: applications } as any);
  vi.mocked(hooks.useCampaign).mockReturnValue({
    data: { ...campaign, ...campaignOverrides },
    isLoading: false,
  } as any);
  vi.mocked(hooks.useApproveApplication).mockReturnValue(noopMutation as any);
  vi.mocked(hooks.useRejectApplication).mockReturnValue(noopMutation as any);
  vi.mocked(hooks.useRefreshApplicationIg).mockReturnValue(noopMutation as any);
  vi.mocked(campaignHooks.useCloseCampaign).mockReturnValue(
    (mutationOverrides.close ?? { ...noopMutation, mutate: vi.fn() }) as any,
  );
  vi.mocked(campaignHooks.useDeleteCampaign).mockReturnValue(
    (mutationOverrides.delete ?? { ...noopMutation, mutate: vi.fn() }) as any,
  );
  vi.mocked(campaignHooks.usePublishCampaign).mockReturnValue(
    (mutationOverrides.publish ?? { ...noopMutation, mutate: vi.fn(), isError: false }) as any,
  );

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CampaignDetailPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CampaignDetailPage — aba Fila (carrossel)', () => {
  // Regressão: a fila renderizava só o candidato ativo, então o resto só era
  // alcançável pelas bolinhas (2px de altura) — arrastar não fazia nada e
  // "a última da fila" parecia ter sumido.
  it('mantém TODAS as candidaturas pendentes no DOM, não só a ativa', async () => {
    renderPage([1, 2, 3, 4, 5].map((i) => makeApplication(i)));

    await waitFor(() => expect(screen.getByText('Creator 1')).toBeInTheDocument());
    for (const i of [2, 3, 4, 5]) {
      expect(screen.getByText(`Creator ${i}`)).toBeInTheDocument();
    }
  });

  it('o pager tem uma bolinha por candidatura da fila', async () => {
    renderPage([1, 2, 3, 4, 5].map((i) => makeApplication(i)));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Candidato 1 de 5' })).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: 'Candidato 5 de 5' })).toBeInTheDocument();
  });

  it('clicar numa bolinha marca aquele candidato como atual', async () => {
    renderPage([1, 2, 3].map((i) => makeApplication(i)));

    const first = await screen.findByRole('button', { name: 'Candidato 1 de 3' });
    const third = screen.getByRole('button', { name: 'Candidato 3 de 3' });
    expect(first).toHaveAttribute('aria-current', 'true');

    fireEvent.click(third);

    expect(third).toHaveAttribute('aria-current', 'true');
    expect(first).toHaveAttribute('aria-current', 'false');
  });

  it('decididas (aprovada/recusada) ficam fora da fila', async () => {
    renderPage([
      makeApplication(1),
      makeApplication(2, { status: 'APPROVED' }),
      makeApplication(3, { status: 'REJECTED' }),
    ]);

    await waitFor(() => expect(screen.getByText('Creator 1')).toBeInTheDocument());
    expect(screen.queryByText('Creator 2')).not.toBeInTheDocument();
    expect(screen.queryByText('Creator 3')).not.toBeInTheDocument();
    // fila de 1 não mostra pager
    expect(screen.queryByRole('button', { name: /^Candidato/ })).not.toBeInTheDocument();
  });

  it('sem pendentes, mostra o estado vazio', async () => {
    renderPage([makeApplication(1, { status: 'APPROVED' })]);

    await waitFor(() =>
      expect(screen.getByText(/nenhuma candidatura aguardando análise/i)).toBeInTheDocument(),
    );
  });
});

describe('CampaignDetailPage — encerrar/apagar', () => {
  it('campanha ACTIVE mostra "Encerrar campanha" e não mostra "Apagar rascunho"', async () => {
    renderPage([], { status: 'ACTIVE' });

    expect(await screen.findByRole('button', { name: /encerrar campanha/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /apagar rascunho/i })).not.toBeInTheDocument();
  });

  it('campanha DRAFT mostra "Apagar rascunho" e não mostra "Encerrar campanha"', async () => {
    renderPage([], { status: 'DRAFT' });

    expect(await screen.findByRole('button', { name: /apagar rascunho/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /encerrar campanha/i })).not.toBeInTheDocument();
  });

  it.each(['CLOSED', 'COMPLETED'] as const)(
    'campanha %s não mostra nem "Encerrar" nem "Apagar"',
    async (status) => {
      renderPage([], { status });

      await waitFor(() => expect(screen.getByText('Basic Drop QA')).toBeInTheDocument());
      expect(screen.queryByRole('button', { name: /encerrar campanha/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /apagar rascunho/i })).not.toBeInTheDocument();
    },
  );

  it.each(['CLOSED', 'COMPLETED'] as const)('campanha %s não oferece publicar', async (status) => {
    renderPage([], { status });

    await waitFor(() => expect(screen.getByText('Basic Drop QA')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /publicar programa/i })).not.toBeInTheDocument();
  });

  it('clicar em "Encerrar campanha" abre a confirmação; "Cancelar" fecha sem chamar a mutation', async () => {
    const closeMutate = vi.fn();
    renderPage([], { status: 'ACTIVE' }, { close: { mutate: closeMutate, isPending: false } });

    fireEvent.click(await screen.findByRole('button', { name: /encerrar campanha/i }));
    expect(await screen.findByText('Encerrar campanha?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(screen.queryByText('Encerrar campanha?')).not.toBeInTheDocument();
    expect(closeMutate).not.toHaveBeenCalled();
  });

  it('confirmar "Encerrar" chama a mutation com o id da campanha', async () => {
    const closeMutate = vi.fn((_id, opts) => opts?.onSuccess?.());
    renderPage([], { status: 'ACTIVE' }, { close: { mutate: closeMutate, isPending: false } });

    fireEvent.click(await screen.findByRole('button', { name: /encerrar campanha/i }));
    fireEvent.click(await screen.findByRole('button', { name: /^encerrar$/i }));

    expect(closeMutate).toHaveBeenCalledWith('camp-1', expect.objectContaining({
      onSuccess: expect.any(Function),
    }));
  });

  it('confirmar "Apagar" chama a mutation e navega pra lista ao ter sucesso', async () => {
    const deleteMutate = vi.fn((_id, opts) => opts?.onSuccess?.());
    renderPage([], { status: 'DRAFT' }, { delete: { mutate: deleteMutate, isPending: false, isError: false } });

    fireEvent.click(await screen.findByRole('button', { name: /apagar rascunho/i }));
    fireEvent.click(await screen.findByRole('button', { name: /^apagar$/i }));

    expect(deleteMutate).toHaveBeenCalledWith('camp-1', expect.objectContaining({
      onSuccess: expect.any(Function),
    }));
    expect(navigateMock).toHaveBeenCalledWith('/brand/campaigns', { replace: true });
  });

  it('botão de confirmação some enquanto a mutation está pendente', async () => {
    renderPage([], { status: 'ACTIVE' }, { close: { mutate: vi.fn(), isPending: true } });

    fireEvent.click(await screen.findByRole('button', { name: /encerrar campanha/i }));
    expect(await screen.findByRole('button', { name: /encerrando/i })).toBeDisabled();
  });
});

// O rascunho salvo com "Agora não" no NewCampaignPage ficava preso em DRAFT
// pra sempre: o publish só existia naquele modal pós-criação. Estas provam a
// saída pelo detalhe.
describe('CampaignDetailPage — publicar/editar rascunho', () => {
  it('campanha DRAFT oferece publicar e editar', async () => {
    renderPage([], { status: 'DRAFT' });

    expect(await screen.findByRole('button', { name: /publicar programa/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^editar$/i })).toHaveAttribute(
      'href',
      '/brand/campaigns/camp-1/edit',
    );
  });

  it('campanha ACTIVE não oferece publicar nem editar (publicado não volta atrás)', async () => {
    renderPage([], { status: 'ACTIVE' });

    await waitFor(() => expect(screen.getByText('Basic Drop QA')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /publicar programa/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^editar$/i })).not.toBeInTheDocument();
  });

  it('clicar em "Publicar programa" pede confirmação antes de chamar a mutation', async () => {
    const publishMutate = vi.fn();
    renderPage([], { status: 'DRAFT' }, { publish: { mutate: publishMutate, isPending: false } });

    fireEvent.click(await screen.findByRole('button', { name: /publicar programa/i }));

    expect(await screen.findByText('Publicar programa?')).toBeInTheDocument();
    expect(publishMutate).not.toHaveBeenCalled();
  });

  it('confirmar "Publicar" chama a mutation com o id da campanha', async () => {
    const publishMutate = vi.fn((_id, opts) => opts?.onSuccess?.());
    renderPage([], { status: 'DRAFT' }, { publish: { mutate: publishMutate, isPending: false } });

    fireEvent.click(await screen.findByRole('button', { name: /publicar programa/i }));
    fireEvent.click(await screen.findByRole('button', { name: /^publicar$/i }));

    expect(publishMutate).toHaveBeenCalledWith(
      'camp-1',
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('"Cancelar" fecha a confirmação sem publicar', async () => {
    const publishMutate = vi.fn();
    renderPage([], { status: 'DRAFT' }, { publish: { mutate: publishMutate, isPending: false } });

    fireEvent.click(await screen.findByRole('button', { name: /publicar programa/i }));
    fireEvent.click(await screen.findByRole('button', { name: /cancelar/i }));

    expect(screen.queryByText('Publicar programa?')).not.toBeInTheDocument();
    expect(publishMutate).not.toHaveBeenCalled();
  });

  // Em erro o modal continua de pé — sumir daria a impressão de que publicou.
  it('falha ao publicar mantém a confirmação aberta com o erro', async () => {
    renderPage(
      [],
      { status: 'DRAFT' },
      { publish: { mutate: vi.fn(), isPending: false, isError: true } },
    );

    fireEvent.click(await screen.findByRole('button', { name: /publicar programa/i }));

    expect(await screen.findByText(/não foi possível publicar/i)).toBeInTheDocument();
    expect(screen.getByText('Publicar programa?')).toBeInTheDocument();
  });
});
