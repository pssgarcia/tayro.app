/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NewCampaignPage from './NewCampaignPage';
import { api } from '../../services/api';

vi.mock('../../services/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const navigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigate };
});

const draft = { id: 'camp-1', title: 'Verão 2026', status: 'DRAFT' };

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <NewCampaignPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Preenche o mínimo que o schema exige para uma oferta em dinheiro. */
function fillForm() {
  fireEvent.change(screen.getByLabelText(/título/i), { target: { value: 'Verão 2026' } });
  fireEvent.change(screen.getByLabelText(/descrição/i), {
    target: { value: 'Conteúdo mostrando o produto no treino' },
  });
  fireEvent.click(screen.getByRole('button', { name: /^fitness$/i }));
  fireEvent.change(screen.getByLabelText(/vagas/i), { target: { value: '5' } });
  fireEvent.change(screen.getByLabelText(/valor \(r\$\)/i), { target: { value: '300' } });
}

beforeEach(() => {
  vi.mocked(api.post).mockReset();
  vi.mocked(api.patch).mockReset();
  navigate.mockReset();
});

describe('NewCampaignPage', () => {
  // `fillForm` deixa "Prazo p/ pagamento (dias)" VAZIO de propósito: o campo é
  // opcional na API, mas `z.coerce.number()` transformava "" em 0 e o .min(1)
  // travava o submit com "Number must be greater than or equal to 1" (em
  // inglês, num campo sem asterisco). Era impossível criar programa sem
  // preencher esse campo.
  it('salvar rascunho envia o valor em centavos, sem exigir o prazo opcional', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: draft } as any);
    renderPage();

    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /salvar rascunho/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/campaigns',
        expect.objectContaining({
          title: 'Verão 2026',
          niches: ['fitness'],
          maxSpots: 5,
          offerType: 'CASH',
          offerAmount: 30000, // R$ 300,00 — dinheiro sempre em centavos
          offerDeadlineDays: undefined,
        }),
      );
    });
  });

  // Este era o beco sem saída: "Agora não" deixava o rascunho salvo sem
  // nenhum caminho de volta pra publicação. Hoje leva pro detalhe, que é onde
  // o botão Publicar vive (CampaignActions).
  it('"Agora não" leva pro detalhe do programa, onde dá pra publicar depois', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: draft } as any);
    renderPage();

    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /salvar rascunho/i }));

    fireEvent.click(await screen.findByRole('button', { name: /agora não/i }));

    expect(navigate).toHaveBeenCalledWith('/brand/campaigns/camp-1');
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('publicar pelo modal chama PATCH /publish e vai pro detalhe', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: draft } as any);
    vi.mocked(api.patch).mockResolvedValue({ data: { ...draft, status: 'ACTIVE' } } as any);
    renderPage();

    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /salvar rascunho/i }));
    fireEvent.click(await screen.findByRole('button', { name: /^publicar$/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/campaigns/camp-1/publish');
    });
    expect(navigate).toHaveBeenCalledWith('/brand/campaigns/camp-1');
  });

  it('não envia nada sem nicho selecionado', async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText(/título/i), { target: { value: 'Verão 2026' } });
    fireEvent.change(screen.getByLabelText(/descrição/i), {
      target: { value: 'Conteúdo mostrando o produto no treino' },
    });
    fireEvent.change(screen.getByLabelText(/vagas/i), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText(/valor \(r\$\)/i), { target: { value: '300' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar rascunho/i }));

    expect(await screen.findByText(/selecione ao menos um nicho/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });
});
