/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ForgotPasswordPage from './ForgotPasswordPage';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/auth.store';

vi.mock('../../services/api', () => ({
  api: { post: vi.fn() },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <ForgotPasswordPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(api.post).mockReset();
  useAuthStore.setState({ accessToken: null, user: null, isInitialized: true });
});

describe('ForgotPasswordPage', () => {
  it('valida e-mail inválido antes de chamar a API', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/e-mail/i), {
      target: { value: 'não-é-email' },
    });
    fireEvent.click(screen.getByRole('button', { name: /enviar/i }));

    expect(await screen.findByText(/e-mail inválido/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('envia o e-mail e mostra mensagem genérica de sucesso', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { message: 'Se este e-mail existir, enviaremos um link de recuperação.' },
    } as any);

    renderPage();
    fireEvent.change(screen.getByLabelText(/e-mail/i), {
      target: { value: 'creator@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /enviar/i }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/auth/forgot-password', {
        email: 'creator@example.com',
      }),
    );
    expect(
      await screen.findByText(/se esse e-mail existir na nossa base/i),
    ).toBeInTheDocument();
  });

  it('a mensagem de sucesso é a mesma independente de o e-mail existir ou não — não há como distinguir pela tela', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} } as any);

    renderPage();
    fireEvent.change(screen.getByLabelText(/e-mail/i), {
      target: { value: 'fantasma@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /enviar/i }));

    expect(
      await screen.findByText(/se esse e-mail existir na nossa base/i),
    ).toBeInTheDocument();
  });

  it('429 mostra mensagem de muitas tentativas', async () => {
    vi.mocked(api.post).mockRejectedValue({
      isAxiosError: true,
      response: { status: 429 },
    });
    renderPage();
    fireEvent.change(screen.getByLabelText(/e-mail/i), {
      target: { value: 'creator@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /enviar/i }));

    expect(await screen.findByText(/muitas tentativas/i)).toBeInTheDocument();
  });

  it('mostra "sem conexão" apenas quando a request não chega ao servidor', async () => {
    vi.mocked(api.post).mockRejectedValue({ isAxiosError: true });
    renderPage();
    fireEvent.change(screen.getByLabelText(/e-mail/i), {
      target: { value: 'creator@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /enviar/i }));

    expect(await screen.findByText(/sem conexão com o servidor/i)).toBeInTheDocument();
  });

  it('oferece um link de volta pro login', () => {
    renderPage();
    const link = screen.getByRole('link', { name: /entrar/i });
    expect(link).toHaveAttribute('href', '/login');
  });

  it('usuária já autenticada é redirecionada pro painel do papel', () => {
    useAuthStore.setState({
      accessToken: 'tok',
      user: { id: 'u1', email: 'a@a.com', role: 'BRAND' },
      isInitialized: true,
    });
    renderPage();
    expect(screen.queryByLabelText(/e-mail/i)).not.toBeInTheDocument();
  });
});
