/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChangePasswordModal from './ChangePasswordModal';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/auth.store';

vi.mock('../../services/api', () => ({
  api: { post: vi.fn() },
}));

const onClose = vi.fn();

function renderModal() {
  return render(<ChangePasswordModal onClose={onClose} />);
}

beforeEach(() => {
  onClose.mockClear();
  vi.mocked(api.post).mockReset();
  useAuthStore.setState({ accessToken: null, user: null, isInitialized: true });
});

describe('ChangePasswordModal', () => {
  it('valida senha atual vazia antes de chamar a API', async () => {
    renderModal();
    fireEvent.change(screen.getByLabelText(/nova senha/i), {
      target: { value: 'senhaNova123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /trocar senha/i }));

    expect(await screen.findByText(/informe a senha atual/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('valida nova senha curta antes de chamar a API', async () => {
    renderModal();
    fireEvent.change(screen.getByLabelText(/senha atual/i), {
      target: { value: 'senhaAtual1' },
    });
    fireEvent.change(screen.getByLabelText(/nova senha/i), {
      target: { value: '123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /trocar senha/i }));

    expect(await screen.findByText(/mínimo 8 caracteres/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('sucesso chama POST /auth/change-password, grava a sessão nova e mostra confirmação', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        accessToken: 'tok-novo',
        user: { id: 'u1', email: 'ana@exemplo.com', role: 'INFLUENCER' },
      },
    } as any);

    renderModal();
    fireEvent.change(screen.getByLabelText(/senha atual/i), {
      target: { value: 'senhaAtual1' },
    });
    fireEvent.change(screen.getByLabelText(/nova senha/i), {
      target: { value: 'senhaNova123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /trocar senha/i }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/auth/change-password', {
        currentPassword: 'senhaAtual1',
        newPassword: 'senhaNova123',
      }),
    );
    expect(useAuthStore.getState().accessToken).toBe('tok-novo');
    expect(await screen.findByText(/senha alterada/i)).toBeInTheDocument();
  });

  it('401 mostra "senha atual incorreta" e mantém a modal aberta pra retry', async () => {
    vi.mocked(api.post).mockRejectedValue({
      isAxiosError: true,
      response: { status: 401 },
    });
    renderModal();
    fireEvent.change(screen.getByLabelText(/senha atual/i), {
      target: { value: 'senhaErrada' },
    });
    fireEvent.change(screen.getByLabelText(/nova senha/i), {
      target: { value: 'senhaNova123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /trocar senha/i }));

    expect(await screen.findByText(/senha atual incorreta/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha atual/i)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('400 mostra que a nova senha precisa ser diferente da atual', async () => {
    vi.mocked(api.post).mockRejectedValue({
      isAxiosError: true,
      response: { status: 400 },
    });
    renderModal();
    fireEvent.change(screen.getByLabelText(/senha atual/i), {
      target: { value: 'senhaAtual1' },
    });
    fireEvent.change(screen.getByLabelText(/nova senha/i), {
      target: { value: 'senhaAtual1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /trocar senha/i }));

    expect(
      await screen.findByText(/nova senha deve ser diferente da atual/i),
    ).toBeInTheDocument();
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
    fireEvent.change(screen.getByLabelText(/nova senha/i), {
      target: { value: 'senhaNova123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /trocar senha/i }));

    expect(await screen.findByText(/muitas tentativas/i)).toBeInTheDocument();
  });

  it('mostra "sem conexão" apenas quando a request não chega ao servidor', async () => {
    vi.mocked(api.post).mockRejectedValue({ isAxiosError: true });
    renderModal();
    fireEvent.change(screen.getByLabelText(/senha atual/i), {
      target: { value: 'senhaAtual1' },
    });
    fireEvent.change(screen.getByLabelText(/nova senha/i), {
      target: { value: 'senhaNova123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /trocar senha/i }));

    expect(await screen.findByText(/sem conexão com o servidor/i)).toBeInTheDocument();
  });

  it('clicar em Cancelar fecha sem chamar a API', () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /^cancelar$/i }));

    expect(onClose).toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('os campos usam autoComplete de senha (current/new) — evita o gerenciador confundir', () => {
    renderModal();
    expect(screen.getByLabelText(/senha atual/i)).toHaveAttribute(
      'autoComplete',
      'current-password',
    );
    expect(screen.getByLabelText(/nova senha/i)).toHaveAttribute(
      'autoComplete',
      'new-password',
    );
  });
});
