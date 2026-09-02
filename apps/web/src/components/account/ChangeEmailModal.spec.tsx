/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ChangeEmailModal from './ChangeEmailModal';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/auth.store';

vi.mock('../../services/api', () => ({
  api: { post: vi.fn() },
}));

const onClose = vi.fn();

function renderModal(currentEmail = 'atual@exemplo.com') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ChangeEmailModal currentEmail={currentEmail} onClose={onClose} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  onClose.mockClear();
  vi.mocked(api.post).mockReset();
  useAuthStore.setState({ accessToken: null, user: null, isInitialized: true });
});

describe('ChangeEmailModal', () => {
  it('mostra o e-mail atual pré-preenchido no campo', () => {
    renderModal('atual@exemplo.com');
    expect(screen.getByLabelText(/novo e-mail/i)).toHaveValue('atual@exemplo.com');
  });

  it('valida e-mail malformado antes de chamar a API', async () => {
    renderModal();
    fireEvent.change(screen.getByLabelText(/novo e-mail/i), {
      target: { value: 'não-é-email' },
    });
    fireEvent.change(screen.getByLabelText(/senha atual/i), {
      target: { value: 'senhaAtual1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /trocar e-mail/i }));

    expect(await screen.findByText(/e-mail inválido/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('valida senha vazia antes de chamar a API', async () => {
    renderModal();
    fireEvent.change(screen.getByLabelText(/novo e-mail/i), {
      target: { value: 'novo@exemplo.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /trocar e-mail/i }));

    expect(await screen.findByText(/informe a senha atual/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('sucesso chama POST /auth/change-email, grava a sessão nova e mostra confirmação', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        accessToken: 'tok-novo',
        user: { id: 'u1', email: 'novo@exemplo.com', role: 'INFLUENCER' },
      },
    } as any);

    renderModal();
    fireEvent.change(screen.getByLabelText(/novo e-mail/i), {
      target: { value: 'novo@exemplo.com' },
    });
    fireEvent.change(screen.getByLabelText(/senha atual/i), {
      target: { value: 'senhaAtual1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /trocar e-mail/i }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/auth/change-email', {
        email: 'novo@exemplo.com',
        password: 'senhaAtual1',
      }),
    );
    expect(useAuthStore.getState().accessToken).toBe('tok-novo');
    expect(await screen.findByText(/e-mail alterado/i)).toBeInTheDocument();
  });

  it('409 mostra "já está em uso" inline no campo de e-mail, não como erro genérico', async () => {
    vi.mocked(api.post).mockRejectedValue({
      isAxiosError: true,
      response: { status: 409, data: { field: 'email', message: 'Este e-mail já está em uso' } },
    });
    renderModal();
    fireEvent.change(screen.getByLabelText(/novo e-mail/i), {
      target: { value: 'ocupado@exemplo.com' },
    });
    fireEvent.change(screen.getByLabelText(/senha atual/i), {
      target: { value: 'senhaAtual1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /trocar e-mail/i }));

    expect(await screen.findByText(/este e-mail já está em uso/i)).toBeInTheDocument();
  });

  it('401 mostra "senha incorreta" e mantém a modal aberta pra retry', async () => {
    vi.mocked(api.post).mockRejectedValue({
      isAxiosError: true,
      response: { status: 401 },
    });
    renderModal();
    fireEvent.change(screen.getByLabelText(/novo e-mail/i), {
      target: { value: 'novo@exemplo.com' },
    });
    fireEvent.change(screen.getByLabelText(/senha atual/i), {
      target: { value: 'senhaErrada' },
    });
    fireEvent.click(screen.getByRole('button', { name: /trocar e-mail/i }));

    expect(await screen.findByText(/senha incorreta/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/novo e-mail/i)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('400 mostra que já é o mesmo e-mail', async () => {
    vi.mocked(api.post).mockRejectedValue({
      isAxiosError: true,
      response: { status: 400 },
    });
    renderModal();
    fireEvent.change(screen.getByLabelText(/novo e-mail/i), {
      target: { value: 'atual@exemplo.com' },
    });
    fireEvent.change(screen.getByLabelText(/senha atual/i), {
      target: { value: 'senhaAtual1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /trocar e-mail/i }));

    expect(await screen.findByText(/já é o seu e-mail/i)).toBeInTheDocument();
  });

  it('429 mostra mensagem de muitas tentativas', async () => {
    vi.mocked(api.post).mockRejectedValue({
      isAxiosError: true,
      response: { status: 429 },
    });
    renderModal();
    fireEvent.change(screen.getByLabelText(/novo e-mail/i), {
      target: { value: 'novo@exemplo.com' },
    });
    fireEvent.change(screen.getByLabelText(/senha atual/i), {
      target: { value: 'senhaAtual1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /trocar e-mail/i }));

    expect(await screen.findByText(/muitas tentativas/i)).toBeInTheDocument();
  });

  it('mostra "sem conexão" apenas quando a request não chega ao servidor', async () => {
    vi.mocked(api.post).mockRejectedValue({ isAxiosError: true });
    renderModal();
    fireEvent.change(screen.getByLabelText(/novo e-mail/i), {
      target: { value: 'novo@exemplo.com' },
    });
    fireEvent.change(screen.getByLabelText(/senha atual/i), {
      target: { value: 'senhaAtual1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /trocar e-mail/i }));

    expect(await screen.findByText(/sem conexão com o servidor/i)).toBeInTheDocument();
  });

  it('clicar em Cancelar fecha sem chamar a API', () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /^cancelar$/i }));

    expect(onClose).toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
  });
});
