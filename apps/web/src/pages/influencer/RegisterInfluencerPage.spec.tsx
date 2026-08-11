/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RegisterInfluencerPage from './RegisterInfluencerPage';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/auth.store';
import { useStepGuard } from '../../hooks/useStepGuard';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('../../services/api', () => ({
  api: { post: vi.fn() },
}));

vi.mock('../../hooks/useStepGuard', () => ({
  useStepGuard: vi.fn(() => false),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <RegisterInfluencerPage />
    </MemoryRouter>,
  );
}

function continueStep() {
  fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
}

/** Preenche os 3 passos e deixa o form na tela final ("Criar conta"). */
async function fillAllSteps({ instagramHandle }: { instagramHandle?: string } = {}) {
  fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Ana Silva' } });
  if (instagramHandle) {
    fireEvent.change(screen.getByLabelText(/instagram/i), { target: { value: instagramHandle } });
  }
  continueStep();

  fireEvent.change(await screen.findByLabelText('E-mail'), {
    target: { value: 'ana@exemplo.com' },
  });
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senhaSegura1' } });
  continueStep();

  await screen.findByRole('button', { name: /criar conta/i });
}

beforeEach(() => {
  navigateMock.mockClear();
  vi.mocked(api.post).mockReset();
  vi.mocked(useStepGuard).mockReturnValue(false);
  useAuthStore.setState({ accessToken: null, user: null, isInitialized: true });
});

describe('RegisterInfluencerPage', () => {
  it('renderiza o passo 1 (Identidade) primeiro', () => {
    renderPage();
    expect(screen.getByLabelText('Nome')).toBeInTheDocument();
    expect(screen.getByLabelText(/instagram/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('E-mail')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continuar/i })).toBeInTheDocument();
  });

  it('não avança do passo 1 sem preencher o nome', async () => {
    renderPage();
    continueStep();

    expect(await screen.findByText(/nome obrigatório/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('E-mail')).not.toBeInTheDocument();
  });

  it('Voltar retorna pro passo anterior preservando os valores digitados', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Ana Silva' } });
    continueStep();

    await screen.findByLabelText('E-mail');
    fireEvent.click(screen.getByRole('button', { name: /voltar/i }));

    expect(await screen.findByLabelText('Nome')).toHaveValue('Ana Silva');
  });

  it('valida senha curta antes de avançar do passo 2', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Ana Silva' } });
    continueStep();

    fireEvent.change(await screen.findByLabelText('E-mail'), {
      target: { value: 'ana@exemplo.com' },
    });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: '123' } });
    continueStep();

    expect(await screen.findByText(/mínimo 8 caracteres/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('desabilita o botão primário quando useStepGuard indica guarda ativa (bug do clique reaproveitado)', () => {
    vi.mocked(useStepGuard).mockReturnValue(true);
    renderPage();

    expect(screen.getByRole('button', { name: /continuar/i })).toBeDisabled();
  });

  it('envia payload, autentica e redireciona pra /influencer', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        accessToken: 'tok-1',
        user: { id: 'u1', email: 'ana@exemplo.com', role: 'INFLUENCER' },
      },
    } as any);

    renderPage();
    await fillAllSteps({ instagramHandle: '@AnaFit' });
    fireEvent.click(screen.getByRole('button', { name: /^crossfit$/i }));
    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/auth/register/influencer', {
        name: 'Ana Silva',
        email: 'ana@exemplo.com',
        password: 'senhaSegura1',
        instagramHandle: 'anafit', // @ removido + lowercase
        niches: ['crossfit'],
      }),
    );
    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith('/influencer', { replace: true }),
    );
    expect(useAuthStore.getState().accessToken).toBe('tok-1');
  });

  it('mostra a mensagem do servidor no email e volta pro passo do e-mail quando 409', async () => {
    vi.mocked(api.post).mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 409,
        data: { message: 'Este e-mail já está em uso', field: 'email' },
      },
    });
    renderPage();
    await fillAllSteps();
    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

    expect(
      await screen.findByText(/este e-mail já está em uso/i),
    ).toBeInTheDocument();
    // O erro é do passo 2 (Acesso) — precisa ter voltado pra lá pra ficar visível.
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('mostra a mensagem do servidor no campo do instagram e volta pro passo 1 quando o handle já existe', async () => {
    vi.mocked(api.post).mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 409,
        data: {
          message: 'Este @ do Instagram já está em uso por outra conta',
          field: 'instagramHandle',
        },
      },
    });
    renderPage();
    await fillAllSteps({ instagramHandle: '@pitringym' });
    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

    expect(
      await screen.findByText(/já está em uso por outra conta/i),
    ).toBeInTheDocument();
    // O erro é do passo 1 (Identidade) — precisa ter voltado pra lá.
    expect(screen.getByLabelText(/instagram/i)).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('mostra "sem conexão" apenas quando a request não chega ao servidor', async () => {
    vi.mocked(api.post).mockRejectedValue({
      isAxiosError: true,
      // sem response = falha de rede real
    });
    renderPage();
    await fillAllSteps();
    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

    expect(await screen.findByText(/sem conexão com o servidor/i)).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
