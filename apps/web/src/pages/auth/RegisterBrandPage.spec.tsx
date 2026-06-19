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

async function fillRequired() {
  fireEvent.change(screen.getByLabelText('Nome da marca'), {
    target: { value: 'Marca Fit' },
  });
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'marca@exemplo.com' },
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

describe('RegisterBrandPage', () => {
  it('renderiza os campos do formulário', () => {
    renderPage();
    expect(screen.getByLabelText('Nome da marca')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toBeInTheDocument();
    expect(screen.getByLabelText(/nichos/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/website/i)).toBeInTheDocument();
  });

  it('valida senha curta antes de chamar a API', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Nome da marca'), {
      target: { value: 'Marca Fit' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'marca@exemplo.com' },
    });
    fireEvent.change(screen.getByLabelText('Senha'), {
      target: { value: '123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

    expect(await screen.findByText(/mínimo 8 caracteres/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('envia payload, autentica e redireciona em caso de sucesso', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        accessToken: 'tok-123',
        user: { id: 'u1', email: 'marca@exemplo.com', role: 'BRAND' },
      },
    } as any);

    renderPage();
    await fillRequired();
    fireEvent.change(screen.getByLabelText(/nichos/i), {
      target: { value: 'fitness, Wellness, fitness' },
    });
    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/auth/register/brand', {
        brandName: 'Marca Fit',
        email: 'marca@exemplo.com',
        password: 'senhaSegura1',
        niches: ['fitness', 'wellness'], // normalizado: trim, lowercase, dedupe
      }),
    );
    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith('/brand', { replace: true }),
    );
    expect(useAuthStore.getState().accessToken).toBe('tok-123');
  });

  it('mostra erro no campo email quando a API retorna 409', async () => {
    vi.mocked(api.post).mockRejectedValue({
      isAxiosError: true,
      response: { status: 409 },
    });
    // axios.isAxiosError checa a flag isAxiosError no objeto
    renderPage();
    await fillRequired();
    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

    expect(
      await screen.findByText(/já existe uma conta com esse e-mail/i),
    ).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('mostra erro de throttle quando a API retorna 429', async () => {
    vi.mocked(api.post).mockRejectedValue({
      isAxiosError: true,
      response: { status: 429 },
    });
    renderPage();
    await fillRequired();
    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

    expect(await screen.findByText(/muitas tentativas/i)).toBeInTheDocument();
  });
});
