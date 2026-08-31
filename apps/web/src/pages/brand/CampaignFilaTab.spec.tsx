/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CampaignFilaTab from './CampaignFilaTab';
import { api } from '../../services/api';
import * as hooks from '../../hooks/useCampaignApplications';
import { makeApplication, campaignFixture } from '../../test/fixtures/applications';
import type { Application } from '../../types/api';

vi.mock('../../services/api', () => ({
  api: { get: vi.fn(), patch: vi.fn(), post: vi.fn() },
}));

// Só as mutations são mockadas. A QUERY é real: o poll-while-PENDING (6s de
// intervalo, teto de 45s) é a lógica que esta capacidade tem de mais fácil de
// quebrar em silêncio, e mockar o hook de dados testaria render, não
// comportamento.
vi.mock('../../hooks/useCampaignApplications', async (importOriginal) => {
  const actual = await importOriginal<typeof hooks>();
  return {
    ...actual,
    useApproveApplication: vi.fn(),
    useRejectApplication: vi.fn(),
    useRefreshApplicationIg: vi.fn(),
  };
});

const noopMutation = () =>
  ({ mutate: vi.fn(), isPending: false, variables: undefined, error: null }) as any;

let approveMutation: any;
let rejectMutation: any;
let refreshIgMutation: any;

function renderTab() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <CampaignFilaTab campaign={campaignFixture} campaignId="camp-1" onExitMobile={vi.fn()} />
    </QueryClientProvider>,
  );
}

/** Deixa a query inicial resolver antes das asserções (relógio virtual: só
 * `await Promise.resolve()` não basta pra react-query commitar o resultado). */
async function settle() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

/** Avança o relógio virtual e deixa a query reagir. */
async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

function mockApplications(...respostas: Application[][]) {
  vi.mocked(api.get).mockReset();
  respostas.forEach((r) => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: r } as any);
  });
  // Da última em diante, repete a última resposta
  const ultima = respostas[respostas.length - 1] ?? [];
  vi.mocked(api.get).mockResolvedValue({ data: ultima } as any);
}

/** A placa clara do desktop — identificada pelo rótulo exclusivo dela. */
const plate = () => screen.getByText('Match Score').closest('section') as HTMLElement;

beforeEach(() => {
  vi.useFakeTimers();
  approveMutation = noopMutation();
  rejectMutation = noopMutation();
  refreshIgMutation = noopMutation();
  vi.mocked(hooks.useApproveApplication).mockReturnValue(approveMutation);
  vi.mocked(hooks.useRejectApplication).mockReturnValue(rejectMutation);
  vi.mocked(hooks.useRefreshApplicationIg).mockReturnValue(refreshIgMutation);
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('CampaignFilaTab — lista Pipeline (desktop)', () => {
  it('lista candidatura de TODOS os status, não só a fila pendente', async () => {
    mockApplications([
      makeApplication('a', { status: 'PENDING', name: 'Ana' }),
      makeApplication('b', { status: 'APPROVED', name: 'Bia' }),
      makeApplication('c', { status: 'REJECTED', name: 'Cris' }),
      makeApplication('d', { status: 'WITHDRAWN', name: 'Dani' }),
    ]);
    renderTab();
    await settle();

    const pipeline = within(screen.getByRole('list'));
    expect(pipeline.getByText('Ana')).toBeInTheDocument();
    expect(pipeline.getByText('Bia')).toBeInTheDocument();
    expect(pipeline.getByText('Cris')).toBeInTheDocument();
    expect(pipeline.getByText('Dani')).toBeInTheDocument();
    expect(pipeline.getByText('Aprovada')).toBeInTheDocument();
    expect(pipeline.getByText('Retirada')).toBeInTheDocument();
  });

  it('seleciona a primeira candidatura por padrão e troca ao clicar em outra linha', async () => {
    mockApplications([
      makeApplication('a', { name: 'Ana' }),
      makeApplication('b', { name: 'Bia' }),
    ]);
    renderTab();
    await settle();

    expect(within(plate()).getByText('Ana')).toBeInTheDocument();

    fireEvent.click(within(screen.getByRole('list')).getByText('Bia'));

    expect(within(plate()).getByText('Bia')).toBeInTheDocument();
  });

  it('mostra o telefone da creator como link tel: na placa de detalhe', async () => {
    mockApplications([makeApplication('a', { name: 'Ana' })]);
    renderTab();
    await settle();

    const link = within(plate()).getByRole('link', { name: '11999990000' });
    expect(link).toHaveAttribute('href', 'tel:11999990000');
  });

  it('não mostra link de telefone quando a creator não tem telefone', async () => {
    mockApplications([makeApplication('a', { name: 'Ana', phone: null })]);
    renderTab();
    await settle();

    const telLinks = within(plate())
      .getAllByRole('link')
      .filter((el) => el.getAttribute('href')?.startsWith('tel:'));
    expect(telLinks).toHaveLength(0);
  });

  it('mostra empty state quando a campanha não tem candidatura', async () => {
    mockApplications([]);
    renderTab();
    await settle();

    expect(screen.getByText(/nenhuma candidatura ainda/i)).toBeInTheDocument();
    expect(screen.getByText(/selecione uma candidatura/i)).toBeInTheDocument();
  });

  it('só oferece aprovar/recusar em candidatura PENDING', async () => {
    mockApplications([makeApplication('a', { status: 'APPROVED', name: 'Bia' })]);
    renderTab();
    await settle();

    expect(within(plate()).queryByRole('button', { name: /aprovar/i })).not.toBeInTheDocument();
    expect(within(plate()).queryByRole('button', { name: /recusar/i })).not.toBeInTheDocument();
  });

  it('aprova e descarta a candidatura selecionada', async () => {
    mockApplications([makeApplication('a', { name: 'Ana' })]);
    renderTab();
    await settle();

    fireEvent.click(within(plate()).getByRole('button', { name: /aprovar/i }));
    expect(approveMutation.mutate).toHaveBeenCalledWith('a');

    fireEvent.click(within(plate()).getByRole('button', { name: /recusar/i }));
    expect(rejectMutation.mutate).toHaveBeenCalledWith('a');
  });
});

// ─── Poll-while-PENDING ────────────────────────────────────────────────────────
// Contrato: reconsulta a cada 6s enquanto existir candidatura PENDING com
// igFetchStatus PENDING; desiste depois de 45s contínuos nessa condição; o
// cronômetro zera se a condição desaparecer.

describe('CampaignFilaTab — poll-while-PENDING', () => {
  const esperandoIg = () => makeApplication('a', { status: 'PENDING', igFetchStatus: 'PENDING' });
  const igPronto = () => makeApplication('a', { status: 'PENDING', igFetchStatus: 'OK' });

  it('reconsulta a cada 6s enquanto o IG de alguém não chegou', async () => {
    mockApplications([esperandoIg()]);
    renderTab();
    await settle();
    expect(api.get).toHaveBeenCalledTimes(1);

    await advance(6_000);
    expect(api.get).toHaveBeenCalledTimes(2);

    await advance(6_000);
    expect(api.get).toHaveBeenCalledTimes(3);
  });

  it('não faz poll nenhum quando todo mundo já tem dado de IG', async () => {
    mockApplications([igPronto()]);
    renderTab();
    await settle();
    expect(api.get).toHaveBeenCalledTimes(1);

    await advance(30_000);

    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it('não faz poll por candidatura já decidida, mesmo com IG pendente', async () => {
    mockApplications([makeApplication('a', { status: 'APPROVED', igFetchStatus: 'PENDING' })]);
    renderTab();
    await settle();

    await advance(30_000);

    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it('para de pollar depois de 45s contínuos esperando (não roda pra sempre)', async () => {
    mockApplications([esperandoIg()]);
    renderTab();
    await settle();

    await advance(45_000);
    const chamadasAteOTeto = vi.mocked(api.get).mock.calls.length;
    expect(chamadasAteOTeto).toBeGreaterThan(1);

    // Passado o teto, nenhuma consulta nova entra
    await advance(60_000);
    expect(api.get).toHaveBeenCalledTimes(chamadasAteOTeto);
  });

  it('zera o cronômetro quando o IG chega: uma pendente futura volta a pollar', async () => {
    // 1ª resposta: esperando · 2ª: chegou · 3ª em diante: nova pendente
    mockApplications(
      [esperandoIg()],
      [igPronto()],
      [igPronto(), makeApplication('b', { status: 'PENDING', igFetchStatus: 'PENDING' })],
    );
    renderTab();
    await settle();

    // Poll roda, o IG chega e o polling para
    await advance(6_000);
    const aposIgChegar = vi.mocked(api.get).mock.calls.length;

    // Nada acontece enquanto ninguém está pendente...
    await advance(45_000);
    expect(api.get).toHaveBeenCalledTimes(aposIgChegar);

    // ...mas uma candidatura nova pendente reativa o poll do zero, sem herdar
    // o tempo já decorrido (era o risco: cronômetro não zerado deixaria a
    // próxima fila sem poll nenhum).
    vi.mocked(api.get).mockResolvedValue({
      data: [igPronto(), makeApplication('b', { status: 'PENDING', igFetchStatus: 'PENDING' })],
    } as any);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <CampaignFilaTab campaign={campaignFixture} campaignId="camp-1" onExitMobile={vi.fn()} />
      </QueryClientProvider>,
    );
    await settle();
    const antes = vi.mocked(api.get).mock.calls.length;

    await advance(6_000);

    expect(vi.mocked(api.get).mock.calls.length).toBeGreaterThan(antes);
  });
});
