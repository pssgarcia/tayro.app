/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DeleteAccountModal from './DeleteAccountModal';
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

const onClose = vi.fn();

function renderModal() {
  return render(
    <MemoryRouter>
      <DeleteAccountModal onClose={onClose} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  onClose.mockClear();
  navigateMock.mockClear();
  vi.mocked(api.post).mockReset();
  useAuthStore.setState({
    accessToken: 'tok-1',
    user: { id: 'u1', email: 'ana@exemplo.com', role: 'INFLUENCER' } as any,
    isInitialized: true,
  });
});

describe('DeleteAccountModal', () => {
  it('mostra a consequência antes de pedir a senha', () => {
    renderModal();
    expect(screen.getByText(/não pode ser desfeito/i)).toBeInTheDocument();
  });

  it('senha vazia mostra erro inline sem chamar a API', async () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /apagar minha conta/i }));

    expect(await screen.findByText(/informe a senha atual/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  // Rota /auth/delete-account de propósito (não /influencers/me): um 401
  // aqui é "senha incorreta" (erro de negócio), e o interceptor global só
  // ISENTA /auth/* do "sessão expirou → desloga" (ver api.spec.ts).
  it('sucesso chama POST /auth/delete-account, limpa a sessão e navega pra "/"', async () => {
    vi.mocked(api.post).mockResolvedValue({} as any);
    renderModal();

    fireEvent.change(screen.getByLabelText(/senha atual/i), {
      target: { value: 'senhaAtual1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /apagar minha conta/i }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/auth/delete-account', {
        password: 'senhaAtual1',
      }),
    );
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(navigateMock).toHaveBeenCalledWith('/', { replace: true });
  });

  it('401 mostra "senha incorreta" e mantém a modal aberta pra retry', async () => {
    vi.mocked(api.post).mockRejectedValue({
      isAxiosError: true,
      response: { status: 401 },
    });
    renderModal();

    fireEvent.change(screen.getByLabelText(/senha atual/i), {
      target: { value: 'senhaErrada' },
    });
    fireEvent.click(screen.getByRole('button', { name: /apagar minha conta/i }));

    expect(await screen.findByText(/senha incorreta/i)).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
    expect(useAuthStore.getState().accessToken).toBe('tok-1');
  });

  it('429 mostra mensagem de muitas tentativas', async () => {
    vi.mocked(api.post).mockRejectedValue({
      isAxiosError: true,
      response: { status: 429 },
    });
    renderModal();

    fireEvent.change(screen.getByLabelText(/senha atual/i), {
      target: { value: 'senhaAtual1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /apagar minha conta/i }));

    expect(await screen.findByText(/muitas tentativas/i)).toBeInTheDocument();
  });

  it('mostra "sem conexão" apenas quando a request não chega ao servidor', async () => {
    vi.mocked(api.post).mockRejectedValue({ isAxiosError: true });
    renderModal();

    fireEvent.change(screen.getByLabelText(/senha atual/i), {
      target: { value: 'senhaAtual1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /apagar minha conta/i }));

    expect(await screen.findByText(/sem conexão com o servidor/i)).toBeInTheDocument();
  });

  it('clicar em Cancelar fecha sem chamar a API', () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /^cancelar$/i }));

    expect(onClose).toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
  });
});
