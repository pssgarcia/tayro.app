/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RegisterBrandPage from './RegisterBrandPage';
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
      <RegisterBrandPage />
    </MemoryRouter>,
  );
}

function continueStep() {
  fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
}

/** Preenche os 3 passos e deixa o form na tela final ("Criar conta"). */
async function fillAllSteps() {
  fireEvent.change(screen.getByLabelText('Nome da marca'), { target: { value: 'Marca Fit' } });
  continueStep();

  fireEvent.change(await screen.findByLabelText('E-mail'), {
    target: { value: 'marca@exemplo.com' },
  });
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senhaSegura1' } });
  continueStep();

  await screen.findByRole('button', { name: /criar conta/i });
}

beforeEach(() => {
  navigateMock.mockClear();
  vi.mocked(api.post).mockReset();
  useAuthStore.setState({ accessToken: null, user: null, isInitialized: true });
});

describe('RegisterBrandPage', () => {
  it('renderiza o passo 1 (Identidade) primeiro', () => {
    renderPage();
    expect(screen.getByLabelText('Nome da marca')).toBeInTheDocument();
    expect(screen.getByLabelText(/website/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('E-mail')).not.toBeInTheDocument();
  });

  it('não avança do passo 1 sem preencher o nome da marca', async () => {
    renderPage();
    continueStep();

    expect(await screen.findByText(/nome da marca obrigatório/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('E-mail')).not.toBeInTheDocument();
  });

  it('valida senha curta antes de avançar do passo 2', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Nome da marca'), { target: { value: 'Marca Fit' } });
    continueStep();

    fireEvent.change(await screen.findByLabelText('E-mail'), {
      target: { value: 'marca@exemplo.com' },
    });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: '123' } });
    continueStep();

    expect(await screen.findByText(/mínimo 8 caracteres/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('chega no passo 3 (Nichos) só com Voltar/Continuar, preservando valores', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Nome da marca'), { target: { value: 'Marca Fit' } });
    continueStep();

    fireEvent.change(await screen.findByLabelText('E-mail'), {
      target: { value: 'marca@exemplo.com' },
    });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senhaSegura1' } });
    fireEvent.click(screen.getByRole('button', { name: /voltar/i }));

    expect(await screen.findByLabelText('Nome da marca')).toHaveValue('Marca Fit');
  });

  it('envia payload, autentica e redireciona em caso de sucesso', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        accessToken: 'tok-123',
        user: { id: 'u1', email: 'marca@exemplo.com', role: 'BRAND' },
      },
    } as any);

    renderPage();
    await fillAllSteps();
    fireEvent.click(screen.getByRole('button', { name: /^fitness$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^wellness$/i }));
    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/auth/register/brand', {
        brandName: 'Marca Fit',
        email: 'marca@exemplo.com',
        password: 'senhaSegura1',
        niches: ['fitness', 'wellness'],
      }),
    );
    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith('/brand', { replace: true }),
    );
    expect(useAuthStore.getState().accessToken).toBe('tok-123');
  });

  it('mostra erro no campo email e volta pro passo do e-mail quando a API retorna 409', async () => {
    vi.mocked(api.post).mockRejectedValue({
      isAxiosError: true,
      response: { status: 409 },
    });
    renderPage();
    await fillAllSteps();
    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

    expect(
      await screen.findByText(/já existe uma conta com esse e-mail/i),
    ).toBeInTheDocument();
    // O erro é do passo 2 (Acesso) — precisa ter voltado pra lá pra ficar visível.
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('mostra erro de throttle quando a API retorna 429', async () => {
    vi.mocked(api.post).mockRejectedValue({
      isAxiosError: true,
      response: { status: 429 },
    });
    renderPage();
    await fillAllSteps();
    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

    expect(await screen.findByText(/muitas tentativas/i)).toBeInTheDocument();
  });
});
