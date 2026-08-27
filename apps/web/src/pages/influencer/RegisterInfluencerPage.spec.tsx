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
  api: { post: vi.fn(), get: vi.fn() },
}));

/** Sem isso, todo teste que passa por um handle no passo 1 chamaria
 * `api.get` de verdade (undefined mock) e derrubaria o teste — os testes
 * abaixo que não são sobre a verificação em si não precisam de um desfecho
 * específico, só de uma resposta que não trave o fluxo. */
function mockHandleCheckFound() {
  vi.mocked(api.get).mockImplementation((url: string) =>
    Promise.resolve({
      data: { handle: url.replace('/ig/handle/', ''), result: 'FOUND' },
    } as any),
  );
}

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
  vi.mocked(api.get).mockReset();
  mockHandleCheckFound();
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

describe('RegisterInfluencerPage — verificação do @ do Instagram', () => {
  it('@ com desfecho "não existe" impede avançar do passo de identidade, e a conta não é criada', async () => {
    vi.mocked(api.get).mockImplementation((url: string) =>
      Promise.resolve({
        data: { handle: url.replace('/ig/handle/', ''), result: 'NOT_FOUND' },
      } as any),
    );
    renderPage();

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Ana Silva' } });
    fireEvent.change(screen.getByLabelText(/instagram/i), {
      target: { value: 'perfilinexistente' },
    });
    continueStep();

    expect(
      await screen.findByText(/usuário não encontrado/i),
    ).toBeInTheDocument();
    // Não avançou: o campo de e-mail (passo 2) não existe na tela.
    expect(screen.queryByLabelText('E-mail')).not.toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('@ com desfecho "indeterminado" NÃO impede o cadastro', async () => {
    vi.mocked(api.get).mockImplementation((url: string) =>
      Promise.resolve({
        data: { handle: url.replace('/ig/handle/', ''), result: 'UNKNOWN' },
      } as any),
    );
    vi.mocked(api.post).mockResolvedValue({
      data: {
        accessToken: 'tok-1',
        user: { id: 'u1', email: 'ana@exemplo.com', role: 'INFLUENCER' },
      },
    } as any);
    renderPage();

    await fillAllSteps({ instagramHandle: 'anafit' });
    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalled());
  });

  it('campo de @ vazio não dispara verificação e não impede o cadastro', async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Ana Silva' } });
    continueStep();

    await screen.findByLabelText('E-mail');
    expect(api.get).not.toHaveBeenCalled();
  });

  it('avançar com @ ainda não verificado (sem blur) verifica antes de avançar', async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Ana Silva' } });
    fireEvent.change(screen.getByLabelText(/instagram/i), { target: { value: 'anafit' } });
    continueStep();

    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/ig/handle/anafit'));
    await screen.findByLabelText('E-mail');
  });

  it('não verifica o mesmo @ duas vezes na mesma tela (sair do campo e depois avançar)', async () => {
    renderPage();

    const campo = screen.getByLabelText(/instagram/i);
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Ana Silva' } });
    fireEvent.change(campo, { target: { value: 'anafit' } });
    fireEvent.blur(campo);

    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));

    continueStep();
    await screen.findByLabelText('E-mail');

    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it('o motivo do bloqueio aparece no campo do @, no passo em que ele está', async () => {
    vi.mocked(api.get).mockImplementation((url: string) =>
      Promise.resolve({
        data: { handle: url.replace('/ig/handle/', ''), result: 'NOT_FOUND' },
      } as any),
    );
    renderPage();

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Ana Silva' } });
    fireEvent.change(screen.getByLabelText(/instagram/i), { target: { value: 'naoexiste' } });
    continueStep();

    const mensagem = await screen.findByText(/usuário não encontrado/i);
    expect(screen.getByLabelText(/instagram/i)).toBeInTheDocument();
    expect(mensagem).toBeInTheDocument();
  });

  it('o endpoint de cadastro continua aceitando handle de formato válido sem depender da verificação ter rodado', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        accessToken: 'tok-1',
        user: { id: 'u1', email: 'ana@exemplo.com', role: 'INFLUENCER' },
      },
    } as any);
    renderPage();

    await fillAllSteps({ instagramHandle: 'anafit' });
    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        '/auth/register/influencer',
        expect.objectContaining({ instagramHandle: 'anafit' }),
      ),
    );
  });
});
