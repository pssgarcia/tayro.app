import { describe, it, expect, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from './LoginPage';
import { useAuthStore } from '../../stores/auth.store';
import { api } from '../../services/api';

vi.mock('../../services/api', () => ({ api: { post: vi.fn() } }));

beforeEach(() => {
  useAuthStore.setState({ accessToken: null, user: null, isInitialized: true });
});

function renderPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  it('oferece um caminho pra ver campanhas abertas', () => {
    renderPage();

    const link = screen.getByRole('link', { name: /ver campanhas abertas/i });
    expect(link).toHaveAttribute('href', '/programs');
  });

  it('oferece "Esqueci minha senha?" apontando para /forgot-password', () => {
    renderPage();

    const link = screen.getByRole('link', { name: /esqueci minha senha/i });
    expect(link).toHaveAttribute('href', '/forgot-password');
  });

  // Regressão de mobile: com o tipo padrão da barra o rótulo custa ~160px e
  // meia barra em 360px tem ~156px, então a frase quebrava em duas linhas ao
  // lado do bloco lime. A fiação do `compact` é o que dá pra travar aqui —
  // jsdom não mede largura de texto.
  it('usa a barra compacta pro rótulo caber numa linha no celular', () => {
    renderPage();

    expect(screen.getByRole('link', { name: /esqueci minha senha/i })).toHaveClass(
      'text-[10px]',
      'sm:text-xs',
    );
  });

  // Achado na conferência visual (2026-09-09): o throttle de /auth/* é 5 req
  // por 15 min por IP, e a tela dizia "Erro de conexão. Tente novamente." —
  // manda a pessoa repetir justamente o que não resolve, com a conexão
  // perfeita. Toda outra tela do produto já separava os dois casos.
  it('429 fala em tentativas, não em conexão', async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockRejectedValueOnce(
      Object.assign(new Error('rate limited'), {
        isAxiosError: true,
        response: { status: 429, data: {} },
      }),
    );
    renderPage();

    await user.type(screen.getByLabelText(/e-mail/i), 'a@b.com');
    await user.type(screen.getByLabelText(/^senha$/i), 'segredo123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(await screen.findByText(/muitas tentativas/i)).toBeInTheDocument();
    expect(screen.queryByText(/erro de conexão/i)).not.toBeInTheDocument();
  });

  it('sem response = sem conexão (a request não chegou ao servidor)', async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockRejectedValueOnce(
      Object.assign(new Error('network'), { isAxiosError: true, response: undefined }),
    );
    renderPage();

    await user.type(screen.getByLabelText(/e-mail/i), 'a@b.com');
    await user.type(screen.getByLabelText(/^senha$/i), 'segredo123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(await screen.findByText(/erro de conexão/i)).toBeInTheDocument();
  });
});
