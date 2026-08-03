/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ClaimAccountPage from './ClaimAccountPage';
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

function renderPage(path = '/claim?token=abc123') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ClaimAccountPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  navigateMock.mockClear();
  vi.mocked(api.post).mockReset();
  useAuthStore.setState({ accessToken: null, user: null, isInitialized: true });
});

describe('ClaimAccountPage', () => {
  it('sem token na URL, mostra link inválido e não renderiza o form', () => {
    renderPage('/claim');
    expect(screen.getByText(/link inválido/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/nova senha/i)).not.toBeInTheDocument();
  });

  it('valida senha curta antes de chamar a API', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/nova senha/i), {
      target: { value: '123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /definir senha e entrar/i }));

    expect(await screen.findByText(/mínimo 8 caracteres/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('envia token da URL + senha, autentica e redireciona pra /influencer', async () => {
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
    fireEvent.click(screen.getByRole('button', { name: /definir senha e entrar/i }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/auth/claim', {
        token: 'abc123',
        password: 'senhaSegura1',
      }),
    );
    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith('/influencer', { replace: true }),
    );
    expect(useAuthStore.getState().accessToken).toBe('tok-1');
  });

  it('401 (token inválido/expirado) mostra mensagem específica', async () => {
    vi.mocked(api.post).mockRejectedValue({
      isAxiosError: true,
      response: { status: 401 },
    });
    renderPage();
    fireEvent.change(screen.getByLabelText(/nova senha/i), {
      target: { value: 'senhaSegura1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /definir senha e entrar/i }));

    expect(await screen.findByText(/link expirou ou já foi utilizado/i)).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('429 mostra mensagem de muitas tentativas', async () => {
    vi.mocked(api.post).mockRejectedValue({
      isAxiosError: true,
      response: { status: 429 },
    });
    renderPage();
    fireEvent.change(screen.getByLabelText(/nova senha/i), {
      target: { value: 'senhaSegura1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /definir senha e entrar/i }));

    expect(await screen.findByText(/muitas tentativas/i)).toBeInTheDocument();
  });

  it('mostra "sem conexão" apenas quando a request não chega ao servidor', async () => {
    vi.mocked(api.post).mockRejectedValue({ isAxiosError: true });
    renderPage();
    fireEvent.change(screen.getByLabelText(/nova senha/i), {
      target: { value: 'senhaSegura1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /definir senha e entrar/i }));

    expect(await screen.findByText(/sem conexão com o servidor/i)).toBeInTheDocument();
  });
});
