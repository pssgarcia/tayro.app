/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ResetPasswordPage from './ResetPasswordPage';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/auth.store';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('../../services/api', () => ({
  api: { post: vi.fn() },
}));

function renderPage(path = '/reset-password?token=abc123') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ResetPasswordPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  navigateMock.mockClear();
  vi.mocked(api.post).mockReset();
  useAuthStore.setState({ accessToken: null, user: null, isInitialized: true });
});

describe('ResetPasswordPage', () => {
  it('sem token na URL, mostra link inválido e não renderiza o form', () => {
    renderPage('/reset-password');
    expect(screen.getByText(/link inválido/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/nova senha/i)).not.toBeInTheDocument();
  });

  it('com token na URL, renderiza o form direto (sem preview/skeleton)', () => {
    renderPage();
    expect(screen.getByLabelText(/nova senha/i)).toBeInTheDocument();
  });

  it('valida senha curta antes de chamar a API', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/nova senha/i), {
      target: { value: '123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /redefinir senha/i }));

    expect(await screen.findByText(/mínimo 8 caracteres/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('sucesso com papel INFLUENCER autentica e navega pra /influencer', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        accessToken: 'tok-1',
        user: { id: 'u1', email: 'ana@exemplo.com', role: 'INFLUENCER' },
      },
    } as any);

    renderPage();
    fireEvent.change(screen.getByLabelText(/nova senha/i), {
      target: { value: 'senhaSegura1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /redefinir senha/i }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/auth/reset-password', {
        token: 'abc123',
        password: 'senhaSegura1',
      }),
    );
    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith('/influencer', { replace: true }),
    );
    expect(useAuthStore.getState().accessToken).toBe('tok-1');
  });

  it('sucesso com papel BRAND navega pra /brand', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        accessToken: 'tok-2',
        user: { id: 'u2', email: 'marca@exemplo.com', role: 'BRAND' },
      },
    } as any);

    renderPage();
    fireEvent.change(screen.getByLabelText(/nova senha/i), {
      target: { value: 'senhaSegura1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /redefinir senha/i }));

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith('/brand', { replace: true }),
    );
  });

  it('401 no submit (token inválido/expirado) mostra mensagem específica com link pro forgot-password', async () => {
    vi.mocked(api.post).mockRejectedValue({
      isAxiosError: true,
      response: { status: 401 },
    });
    renderPage();
    fireEvent.change(screen.getByLabelText(/nova senha/i), {
      target: { value: 'senhaSegura1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /redefinir senha/i }));

    expect(await screen.findByText(/link expirou ou já foi utilizado/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /pedir um novo link/i })).toHaveAttribute(
      'href',
      '/forgot-password',
    );
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('429 no submit mostra mensagem de muitas tentativas', async () => {
    vi.mocked(api.post).mockRejectedValue({
      isAxiosError: true,
      response: { status: 429 },
    });
    renderPage();
    fireEvent.change(screen.getByLabelText(/nova senha/i), {
      target: { value: 'senhaSegura1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /redefinir senha/i }));

    expect(await screen.findByText(/muitas tentativas/i)).toBeInTheDocument();
  });

  it('mostra "sem conexão" apenas quando a request não chega ao servidor', async () => {
    vi.mocked(api.post).mockRejectedValue({ isAxiosError: true });
    renderPage();
    fireEvent.change(screen.getByLabelText(/nova senha/i), {
      target: { value: 'senhaSegura1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /redefinir senha/i }));

    expect(await screen.findByText(/sem conexão com o servidor/i)).toBeInTheDocument();
  });

  it('usuária já autenticada é redirecionada pro painel do papel', () => {
    useAuthStore.setState({
      accessToken: 'tok',
      user: { id: 'u1', email: 'a@a.com', role: 'BRAND' },
      isInitialized: true,
    });
    renderPage();
    expect(screen.queryByLabelText(/nova senha/i)).not.toBeInTheDocument();
  });
});
