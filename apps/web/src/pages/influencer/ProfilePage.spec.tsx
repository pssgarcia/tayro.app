/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProfilePage from './ProfilePage';
import * as hooks from '../../hooks/useInfluencerProfile';
import type { InfluencerProfile } from '../../types/api';

vi.mock('../../hooks/useInfluencerProfile', () => ({
  useInfluencerProfile: vi.fn(),
  useUpdateInfluencerProfile: vi.fn(),
  influencerProfileKeys: { me: ['influencer', 'profile'] },
}));

const baseProfile: InfluencerProfile = {
  id: 'inf-1',
  name: 'Ana Silva',
  email: 'ana@exemplo.com',
  avatarUrl: null,
  bio: 'Treino funcional.',
  city: 'Belo Horizonte',
  phone: null,
  niches: ['fitness'],
  instagramHandle: 'anafit',
  tiktokHandle: null,
  followersCount: 1200,
  igEngagementRate: 4.2,
  igFetchStatus: 'OK',
  publicProfileEnabled: false,
  publicPhoneEnabled: false,
  createdAt: '2026-06-01T00:00:00.000Z',
};

const mutateAsync = vi.fn();

function mockHooks(
  query: Partial<{
    data: InfluencerProfile;
    isLoading: boolean;
    isError: boolean;
  }> = {},
  mutation: Partial<{ isSuccess: boolean; isPending: boolean }> = {},
) {
  vi.mocked(hooks.useInfluencerProfile).mockReturnValue({
    data: baseProfile,
    isLoading: false,
    isError: false,
    ...query,
  } as any);
  vi.mocked(hooks.useUpdateInfluencerProfile).mockReturnValue({
    mutateAsync,
    isSuccess: false,
    isPending: false,
    ...mutation,
  } as any);
}

// QueryClientProvider real (não mockado): ChangeEmailModal usa useQueryClient
// de verdade pra invalidar os dois caches de perfil — os hooks de dado
// continuam mockados acima, só o client em si precisa existir na árvore.
function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ProfilePage />
    </QueryClientProvider>,
  );
}

/** Abre uma row de "Editar", troca o valor no modal e salva — fecha o modal. */
function editRowTo(label: string, newValue: string) {
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${label}`, 'i') }));
  const dialog = screen.getByRole('dialog', { name: label });
  fireEvent.change(within(dialog).getByLabelText(label), { target: { value: newValue } });
  fireEvent.click(within(dialog).getByRole('button', { name: /^salvar$/i }));
}

/** Abre a row "Nome", edita no modal e salva — fecha o modal. */
function editNameTo(newValue: string) {
  fireEvent.click(screen.getByRole('button', { name: /^nome/i }));
  const dialog = screen.getByRole('dialog', { name: 'Nome' });
  fireEvent.change(within(dialog).getByLabelText('Nome'), { target: { value: newValue } });
  fireEvent.click(within(dialog).getByRole('button', { name: /^salvar$/i }));
}

beforeEach(() => {
  mutateAsync.mockReset();
  mutateAsync.mockResolvedValue(baseProfile);
  mockHooks();
});

describe('Creator ProfilePage', () => {
  it('mostra skeleton enquanto carrega', () => {
    mockHooks({ isLoading: true });
    const { container } = renderPage();
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('mostra erro em isError', () => {
    mockHooks({ isError: true, isLoading: false });
    renderPage();
    expect(screen.getByText(/erro ao carregar o perfil/i)).toBeInTheDocument();
  });

  it('mostra os dados do perfil na placa e nas rows de "Editar"; email é texto', () => {
    renderPage();
    // "Ana Silva" aparece na placa-preview E na row "Nome"
    expect(screen.getAllByText('Ana Silva').length).toBeGreaterThan(1);
    expect(screen.getByText('Belo Horizonte')).toBeInTheDocument();
    expect(screen.getAllByText('ana@exemplo.com').length).toBeGreaterThan(0);
    expect(screen.queryByDisplayValue('ana@exemplo.com')).not.toBeInTheDocument();
  });

  it('clicar numa row abre um modal placa-formulário pra editar aquele campo', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /^nome/i }));
    const dialog = screen.getByRole('dialog', { name: 'Nome' });
    expect(within(dialog).getByLabelText('Nome')).toHaveValue('Ana Silva');
  });

  it('editar e salvar no modal atualiza a row e a placa em destaque (ao vivo após salvar)', () => {
    renderPage();
    editNameTo('Ana Renovada');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getAllByText('Ana Renovada').length).toBeGreaterThan(1);
    expect(screen.queryByText('Ana Silva')).not.toBeInTheDocument();
  });

  it('cancelar no modal não altera o valor', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /^nome/i }));
    const dialog = screen.getByRole('dialog', { name: 'Nome' });
    fireEvent.change(within(dialog).getByLabelText('Nome'), { target: { value: 'Rascunho' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /^cancelar$/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Rascunho')).not.toBeInTheDocument();
    expect(screen.getAllByText('Ana Silva').length).toBeGreaterThan(1);
  });

  it('botão salvar da página começa desabilitado e habilita depois de editar um campo', () => {
    renderPage();
    const btn = screen.getByRole('button', { name: /^salvar$/i });
    expect(btn).toBeDisabled();

    editNameTo('Ana Renovada');
    expect(screen.getByRole('button', { name: /^salvar$/i })).toBeEnabled();
  });

  it('o toggle de perfil público reflete o estado e habilita salvar ao alternar', () => {
    renderPage();
    const toggle = screen.getByRole('switch', {
      name: /tornar meu perfil público/i,
    });
    expect(toggle).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: /^salvar$/i })).toBeEnabled();
  });

  it('salva enviando publicProfileEnabled=true após ativar o toggle (LGPD)', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('switch', { name: /tornar meu perfil público/i }));
    fireEvent.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Ana Silva',
          publicProfileEnabled: true,
          niches: ['fitness'],
        }),
      ),
    );
  });

  // ─── Telefone ───────────────────────────────────────────────────────────
  // O telefone é o canal que a marca usa pra chamar no WhatsApp depois de
  // aprovar (specs/creator-roster). Quem se cadastrou antes de 2026-09-02 tem
  // o campo vazio, e esta é a única superfície onde dá pra preencher.

  it('mostra o telefone salvo na row "Telefone"', () => {
    mockHooks({ data: { ...baseProfile, phone: '(11) 91234-5678' } });
    renderPage();

    expect(screen.getByText('(11) 91234-5678')).toBeInTheDocument();
  });

  it('salva o telefone editado na row', async () => {
    renderPage();
    editRowTo('Telefone', '(21) 98888-7777');
    fireEvent.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ phone: '(21) 98888-7777' }),
      ),
    );
  });

  it('não salva telefone em formato inválido', async () => {
    renderPage();
    editRowTo('Telefone', 'me liga aí');
    fireEvent.click(screen.getByRole('button', { name: /^salvar$/i }));

    expect(await screen.findByText(/telefone inválido/i)).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  // ─── Opt-in de telefone no perfil público ───────────────────────────────
  // Separado do "Perfil público" de propósito: /c/:handle é página pública e
  // indexável, e o telefone foi dado pra marca usar DEPOIS de aprovar uma
  // candidatura. Ver specs/public-creator-profile.

  it('não oferece o opt-in de telefone público sem telefone preenchido', () => {
    mockHooks({ data: { ...baseProfile, phone: null, publicProfileEnabled: true } });
    renderPage();

    expect(
      screen.queryByRole('switch', { name: /mostrar meu telefone/i }),
    ).not.toBeInTheDocument();
  });

  it('não oferece o opt-in de telefone público com o perfil privado', () => {
    mockHooks({
      data: { ...baseProfile, phone: '(11) 91234-5678', publicProfileEnabled: false },
    });
    renderPage();

    expect(
      screen.queryByRole('switch', { name: /mostrar meu telefone/i }),
    ).not.toBeInTheDocument();
  });

  it('salva o opt-in de telefone público', async () => {
    mockHooks({
      data: { ...baseProfile, phone: '(11) 91234-5678', publicProfileEnabled: true },
    });
    renderPage();

    fireEvent.click(screen.getByRole('switch', { name: /mostrar meu telefone/i }));
    fireEvent.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ publicPhoneEnabled: true }),
      ),
    );
  });

  // Apagar o campo é como a creator remove o telefone — a API converte "" em
  // null. Sem aceitar vazio, um telefone errado seria impossível de tirar.
  it('permite apagar o telefone', async () => {
    mockHooks({ data: { ...baseProfile, phone: '(11) 91234-5678' } });
    renderPage();
    editRowTo('Telefone', '');
    fireEvent.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ phone: '' })),
    );
  });
});

describe('Creator ProfilePage — seção Conta', () => {
  it('mostra a row "Senha" na seção Conta', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /^senha/i })).toBeInTheDocument();
  });

  it('mostra a row "E-mail" clicável com o e-mail atual', () => {
    renderPage();
    const row = screen.getByRole('button', { name: /^e-mail/i });
    expect(within(row).getByText('ana@exemplo.com')).toBeInTheDocument();
  });

  it('clicar em "E-mail" abre o modal de trocar e-mail com o valor pré-preenchido', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /^e-mail/i }));
    const dialog = screen.getByRole('dialog', { name: /trocar e-mail/i });
    expect(within(dialog).getByLabelText(/novo e-mail/i)).toHaveValue('ana@exemplo.com');
  });

  it('clicar em "Senha" abre o modal de trocar senha', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /^senha/i }));
    expect(screen.getByRole('dialog', { name: /trocar senha/i })).toBeInTheDocument();
  });

  // Regressão: a seção Conta não participa do form de perfil — abrir/fechar
  // o modal de senha não pode habilitar o "Salvar" do perfil sem nada a salvar.
  it('abrir e fechar o modal de senha não habilita o "Salvar" do perfil', () => {
    renderPage();
    const saveButton = screen.getByRole('button', { name: /^salvar$/i });
    expect(saveButton).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /^senha/i }));
    fireEvent.click(screen.getByRole('button', { name: /^cancelar$/i }));

    expect(saveButton).toBeDisabled();
  });

  it('abrir e fechar o modal de e-mail não habilita o "Salvar" do perfil', () => {
    renderPage();
    const saveButton = screen.getByRole('button', { name: /^salvar$/i });
    expect(saveButton).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /^e-mail/i }));
    fireEvent.click(screen.getByRole('button', { name: /^cancelar$/i }));

    expect(saveButton).toBeDisabled();
  });
});

// A tela prometia o endereço público como texto puro desde a v0.9.0; a rota
// existe desde a v0.32.0 e mesmo assim continuou sem ser clicável.
describe('Creator ProfilePage — link do perfil público', () => {
  it('com perfil público ativo, o endereço vira link de verdade', () => {
    mockHooks({ data: { ...baseProfile, publicProfileEnabled: true } });
    renderPage();

    const link = screen.getByRole('link', { name: /\/c\/anafit/i });
    expect(link).toHaveAttribute('href', '/c/anafit');
    // Aba nova: a creator pode estar no meio de uma edição do formulário.
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('copiar link põe a URL absoluta na área de transferência', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    mockHooks({ data: { ...baseProfile, publicProfileEnabled: true } });
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /copiar link/i }));

    expect(writeText).toHaveBeenCalledWith('http://localhost:3000/c/anafit');
    expect(await screen.findByText(/copiado!/i)).toBeInTheDocument();
  });

  // GET /creators/:handle/public devolve 404 uniforme quando o perfil é
  // privado (anti-enumeração) — linkar aqui mandaria a creator pro 404.
  it('com perfil privado não oferece link, explica que precisa ativar', () => {
    mockHooks({ data: { ...baseProfile, publicProfileEnabled: false } });
    renderPage();

    expect(screen.queryByRole('link', { name: /\/c\//i })).not.toBeInTheDocument();
    expect(screen.getByText(/ative para as marcas encontrarem você/i)).toBeInTheDocument();
  });

  // Estado salvo no servidor, não o do form: com o toggle recém-ligado e ainda
  // não salvo, o backend continua devolvendo 404 pra esse handle.
  it('ligar o toggle sem salvar ainda não oferece o link', () => {
    mockHooks({ data: { ...baseProfile, publicProfileEnabled: false } });
    renderPage();

    fireEvent.click(screen.getByRole('switch', { name: /tornar meu perfil público/i }));

    expect(screen.queryByRole('link', { name: /\/c\//i })).not.toBeInTheDocument();
  });

  it('sem handle do Instagram não promete endereço nenhum', () => {
    mockHooks({
      data: { ...baseProfile, instagramHandle: null, publicProfileEnabled: true },
    });
    renderPage();

    expect(screen.queryByRole('link', { name: /\/c\//i })).not.toBeInTheDocument();
    expect(screen.getByText(/adicione seu @ do instagram/i)).toBeInTheDocument();
  });
});
