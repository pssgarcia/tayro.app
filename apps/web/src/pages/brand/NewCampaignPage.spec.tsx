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

/**
 * Preenche só o que o schema exige de fato para uma oferta em dinheiro.
 * Deixa "Prazo p/ pagamento (dias)" VAZIO de propósito — é o campo opcional
 * que travava o submit.
 */
function fillRequiredFields() {
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
  navigate.mockReset();
});

describe('NewCampaignPage', () => {
  // Regressão: input numérico vazio chega como "", z.coerce.number() converte
  // em 0 e o .min(1) estoura — .optional() só aceita undefined. O prazo de
  // pagamento é opcional na API e não tem asterisco na tela, mas bloqueava a
  // criação de programa com "Number must be greater than or equal to 1".
  it('cria o rascunho sem preencher o prazo opcional', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: draft } as any);
    renderPage();

    fillRequiredFields();
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

  it('não mostra erro em inglês no campo de prazo', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: draft } as any);
    renderPage();

    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: /salvar rascunho/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalled());
    expect(screen.queryByText(/must be greater than or equal to/i)).not.toBeInTheDocument();
  });

  it('prazo preenchido continua indo no payload', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: draft } as any);
    renderPage();

    fillRequiredFields();
    fireEvent.change(screen.getByLabelText(/prazo p\/ pagamento/i), { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar rascunho/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/campaigns',
        expect.objectContaining({ offerDeadlineDays: 15 }),
      );
    });
  });

  // O preprocess não pode afrouxar a validação de quem digitou algo inválido.
  // Zero é barrado ANTES do zod: o input tem `min={1}` e o form não usa
  // `noValidate`, então a validação nativa do browser bloqueia o submit e o
  // resolver nem roda (por isso aqui se afirma "não criou", e não uma mensagem
  // nossa na tela — ela não chega a aparecer). A regra `.min(1)` no schema é a
  // rede de segurança para o dia em que o `min` do input sumir.
  it('prazo zero não cria o programa', async () => {
    renderPage();

    fillRequiredFields();
    const prazo = screen.getByLabelText(/prazo p\/ pagamento/i) as HTMLInputElement;
    fireEvent.change(prazo, { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar rascunho/i }));

    // Dá tempo de a validação assíncrona assentar antes de afirmar a ausência.
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(prazo.validity.rangeUnderflow).toBe(true);
    expect(api.post).not.toHaveBeenCalled();
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
