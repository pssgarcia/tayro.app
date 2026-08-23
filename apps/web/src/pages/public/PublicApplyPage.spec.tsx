/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * PublicApplyPage — a única tela do produto sem guard nenhum, e a que cria
 * conta. É a superfície de maior risco da capacidade `creator-discovery-and-apply`
 * e não tinha teste.
 *
 * O foco é o contrato observável: o que é enviado à API, e o que a visitante vê
 * em cada resposta (201 / 409 / 429 / erro genérico). Campanha fora de ACTIVE
 * não pode nem mostrar o formulário.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PublicApplyPage from './PublicApplyPage';
import { api } from '../../services/api';
import { campaignFixture } from '../../test/fixtures/applications';
import type { Campaign } from '../../types/api';

vi.mock('../../services/api', () => ({
  api: { get: vi.fn(), post: vi.fn() },
}));

const campanhaPublica: Campaign = {
  ...campaignFixture,
  title: 'Campanha Verão',
  description: 'Conteúdo de treino com o produto',
  brand: { name: 'Lilo', logoUrl: null, website: null },
};

/** `retryDelay: 0` porque a página fixa `retry: 1` na própria query — sem
 * zerar o backoff, o estado de erro só apareceria depois do atraso padrão. */
function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } });
}

function renderInRoute(queryClient: QueryClient, entry = '/apply/camp-1') {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/apply/:id" element={<PublicApplyPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function renderPage(campaign: Partial<Campaign> = {}) {
  vi.mocked(api.get).mockResolvedValue({
    data: { ...campanhaPublica, ...campaign },
  } as any);

  return renderInRoute(makeClient());
}

/** Erro no formato que o axios entrega ao componente. */
const httpError = (status: number, message?: string) => ({
  response: { status, data: message ? { message } : {} },
});

async function preencherEEnviar(
  user: ReturnType<typeof userEvent.setup>,
  overrides: { handle?: string; email?: string } = {},
) {
  await user.type(
    screen.getByLabelText(/@ do instagram/i),
    overrides.handle ?? 'anafit',
  );
  await user.type(
    screen.getByLabelText(/e-mail/i),
    overrides.email ?? 'ana@email.com',
  );
  await user.click(screen.getByRole('button', { name: /quero participar/i }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PublicApplyPage — carga da campanha', () => {
  it('mostra a oferta e a marca da campanha', async () => {
    renderPage();

    expect(await screen.findByText('Lilo')).toBeInTheDocument();
    expect(screen.getByText('Campanha Verão')).toBeInTheDocument();
  });

  it('mostra "programa não encontrado" quando a campanha não existe', async () => {
    vi.mocked(api.get).mockRejectedValue(httpError(404));

    renderInRoute(makeClient(), '/apply/ghost');

    expect(
      await screen.findByText(/programa não encontrado/i, undefined, {
        timeout: 3000,
      }),
    ).toBeInTheDocument();
  });

  // Campanha encerrada continua visível (o link já circulou por aí), mas não
  // pode aceitar candidatura nova.
  it.each(['DRAFT', 'CLOSED', 'COMPLETED'] as const)(
    'não mostra formulário em campanha %s',
    async (status) => {
      renderPage({ status });

      expect(await screen.findByText(/inscrições encerradas/i)).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /quero participar/i }),
      ).not.toBeInTheDocument();
    },
  );
});

describe('PublicApplyPage — envio da candidatura', () => {
  it('envia handle e e-mail para a rota pública de candidatura', async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValue({ data: {} } as any);
    renderPage();
    await screen.findByText('Lilo');

    await preencherEEnviar(user);

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/programs/camp-1/apply/public', {
        igHandle: 'anafit',
        email: 'ana@email.com',
        name: undefined,
        message: undefined,
      }),
    );
  });

  // O @ digitado é normalizado antes de sair do browser: o backend chaveia a
  // conta por handle, e "@Ana" e "ana" precisam ser a mesma pessoa.
  it('normaliza o @ e o caixa alta antes de enviar', async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValue({ data: {} } as any);
    renderPage();
    await screen.findByText('Lilo');

    await preencherEEnviar(user, { handle: '@AnaFit' });

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        '/programs/camp-1/apply/public',
        expect.objectContaining({ igHandle: 'anafit' }),
      ),
    );
  });

  it('confirma o envio na própria placa, sem sair da página', async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValue({ data: {} } as any);
    renderPage();
    await screen.findByText('Lilo');

    await preencherEEnviar(user);

    expect(await screen.findByText(/candidatura enviada/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /quero participar/i }),
    ).not.toBeInTheDocument();
  });

  it('recusa handle com caractere inválido sem chamar a API', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Lilo');

    await preencherEEnviar(user, { handle: 'ana fit!' });

    expect(await screen.findByText(/handle inválido/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('recusa e-mail inválido sem chamar a API', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Lilo');

    await preencherEEnviar(user, { email: 'nao-e-email' });

    expect(await screen.findByText(/e-mail inválido/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });
});

describe('PublicApplyPage — respostas de erro da API', () => {
  const cenarios = [
    {
      nome: '409 com mensagem curta do servidor mostra a mensagem real',
      erro: httpError(409, 'Você já se candidatou a este programa'),
      esperado: /já se candidatou a este programa/i,
    },
    {
      nome: '409 sem mensagem usável cai no texto genérico',
      erro: httpError(409),
      esperado: /já se candidatou ou este e-mail já está em uso/i,
    },
    {
      nome: '429 explica o throttle em vez de "erro"',
      erro: httpError(429),
      esperado: /muitas tentativas/i,
    },
    {
      nome: '500 mostra erro genérico',
      erro: httpError(500),
      esperado: /algo deu errado/i,
    },
  ];

  it.each(cenarios)('$nome', async ({ erro, esperado }) => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockRejectedValue(erro);
    renderPage();
    await screen.findByText('Lilo');

    await preencherEEnviar(user);

    expect(await screen.findByText(esperado)).toBeInTheDocument();
  });

  // O formulário fica no lugar depois do erro: a visitante corrige e reenvia
  // sem redigitar tudo.
  it('mantém o formulário disponível para nova tentativa após erro', async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockRejectedValue(httpError(500));
    renderPage();
    await screen.findByText('Lilo');

    await preencherEEnviar(user);
    await screen.findByText(/algo deu errado/i);

    expect(
      screen.getByRole('button', { name: /quero participar/i }),
    ).toBeEnabled();
  });
});
