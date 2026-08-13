/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from './LoginPage';
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

function renderPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
}

function fillCredentials() {
  fireEvent.change(screen.getByLabelText('E-mail'), {
    target: { value: 'marca@exemplo.com' },
  });
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senhaSegura1' } });
}

beforeEach(() => {
  navigateMock.mockClear();
  vi.mocked(api.post).mockReset();
  useAuthStore.setState({ accessToken: null, user: null, isInitialized: true });
});

describe('LoginPage', () => {
  it('login de marca guarda o token e vai pro /brand', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        accessToken: 'token-123',
        user: { id: 'u1', email: 'marca@exemplo.com', role: 'BRAND' },
      },
    } as any);
    renderPage();

    fillCredentials();
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        email: 'marca@exemplo.com',
        password: 'senhaSegura1',
      });
    });
    // accessToken vive em memória (Zustand), nunca em localStorage.
    await waitFor(() => {
      expect(useAuthStore.getState().accessToken).toBe('token-123');
    });
    expect(navigateMock).toHaveBeenCalledWith('/brand', { replace: true });
  });

  it('creator cai no /influencer', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        accessToken: 'token-123',
        user: { id: 'u2', email: 'creator@exemplo.com', role: 'INFLUENCER' },
      },
    } as any);
    renderPage();

    fillCredentials();
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/influencer', { replace: true });
    });
  });

  it('401 mostra credenciais inválidas, não erro de conexão', async () => {
    vi.mocked(api.post).mockRejectedValue({
      isAxiosError: true,
      response: { status: 401 },
    });
    renderPage();

    fillCredentials();
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    expect(await screen.findByText(/email ou senha incorretos/i)).toBeInTheDocument();
  });

  it('não envia credenciais com e-mail inválido', async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'nao-e-email' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    expect(await screen.findByText(/e-mail inválido/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  // Regressão: o mock previa um secundário "Esqueci", mas não existe fluxo de
  // recuperação de senha (nem endpoint nem tela). O botão ficou clicável em
  // produção sem fazer nada. Só volta junto com o fluxo de verdade.
  it('não oferece "Esqueci" enquanto não houver recuperação de senha', () => {
    renderPage();

    expect(screen.queryByRole('button', { name: /esqueci/i })).not.toBeInTheDocument();
  });
});
