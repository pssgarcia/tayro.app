/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RegisterInfluencerPage from './RegisterInfluencerPage';
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
      <RegisterInfluencerPage />
    </MemoryRouter>,
  );
}

function fillRequired() {
  fireEvent.change(screen.getByLabelText('Nome'), {
    target: { value: 'Ana Silva' },
  });
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'ana@exemplo.com' },
  });
  fireEvent.change(screen.getByLabelText('Senha'), {
    target: { value: 'senhaSegura1' },
  });
}

beforeEach(() => {
  navigateMock.mockClear();
  vi.mocked(api.post).mockReset();
  useAuthStore.setState({ accessToken: null, user: null, isInitialized: true });
});

describe('RegisterInfluencerPage', () => {
  it('renderiza os campos', () => {
    renderPage();
    expect(screen.getByLabelText('Nome')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toBeInTheDocument();
    expect(screen.getByLabelText(/instagram/i)).toBeInTheDocument();
  });

  it('valida senha curta antes de chamar a API', async () => {
    renderPage();
    fillRequired();
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

    expect(await screen.findByText(/mínimo 8 caracteres/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('envia payload, autentica e redireciona pra /influencer', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        accessToken: 'tok-1',
        user: { id: 'u1', email: 'ana@exemplo.com', role: 'INFLUENCER' },
      },
    } as any);

    renderPage();
    fillRequired();
    fireEvent.change(screen.getByLabelText(/instagram/i), {
      target: { value: '@AnaFit' },
    });
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

  it('mostra erro no email quando a API retorna 409', async () => {
    vi.mocked(api.post).mockRejectedValue({
      isAxiosError: true,
      response: { status: 409 },
    });
    renderPage();
    fillRequired();
    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

    expect(
      await screen.findByText(/já existe uma conta com esse e-mail/i),
    ).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
