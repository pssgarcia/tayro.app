/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import ProfilePage from './ProfilePage';
import * as hooks from '../../hooks/useBrandProfile';
import type { BrandProfile } from '../../types/api';

vi.mock('../../hooks/useBrandProfile', () => ({
  useBrandProfile: vi.fn(),
  useUpdateBrandProfile: vi.fn(),
  brandProfileKeys: { me: ['brand', 'profile'] },
}));

const baseProfile: BrandProfile = {
  id: 'brand-1',
  name: 'Marca Fit',
  email: 'marca@exemplo.com',
  logoUrl: null,
  niches: ['fitness', 'wellness'],
  website: 'https://marca.com',
  bio: 'Suplementos para creators.',
  createdAt: '2026-06-01T00:00:00.000Z',
};

const mutateAsync = vi.fn();

function mockHooks(
  query: Partial<{ data: BrandProfile; isLoading: boolean; isError: boolean }> = {},
  mutation: Partial<{ isSuccess: boolean; isPending: boolean }> = {},
) {
  vi.mocked(hooks.useBrandProfile).mockReturnValue({
    data: baseProfile,
    isLoading: false,
    isError: false,
    ...query,
  } as any);
  vi.mocked(hooks.useUpdateBrandProfile).mockReturnValue({
    mutateAsync,
    isSuccess: false,
    isPending: false,
    ...mutation,
  } as any);
}

/** Abre a row "Nome da marca", edita no modal e salva. */
function editNameTo(newValue: string) {
  fireEvent.click(screen.getByRole('button', { name: /^nome da marca/i }));
  const dialog = screen.getByRole('dialog', { name: 'Nome da marca' });
  fireEvent.change(within(dialog).getByLabelText('Nome da marca'), {
    target: { value: newValue },
  });
  fireEvent.click(within(dialog).getByRole('button', { name: /^salvar$/i }));
}

/** Abre a row "Nichos", clica num nicho dentro do modal e salva. */
function toggleNicheInModal(niche: string) {
  fireEvent.click(screen.getByRole('button', { name: /^nichos/i }));
  const dialog = screen.getByRole('dialog', { name: 'Nichos' });
  fireEvent.click(within(dialog).getByRole('button', { name: new RegExp(`^${niche}$`, 'i') }));
  fireEvent.click(within(dialog).getByRole('button', { name: /^salvar$/i }));
}

beforeEach(() => {
  mutateAsync.mockReset();
  mutateAsync.mockResolvedValue(baseProfile);
  mockHooks();
});

describe('ProfilePage', () => {
  it('mostra skeleton enquanto carrega', () => {
    mockHooks({ isLoading: true });
    const { container } = render(<ProfilePage />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('mostra erro em isError', () => {
    mockHooks({ isError: true, isLoading: false });
    render(<ProfilePage />);
    expect(screen.getByText(/erro ao carregar o perfil/i)).toBeInTheDocument();
  });

  it('mostra os dados do perfil na placa e nas rows de "Editar"; email é texto', () => {
    render(<ProfilePage />);
    expect(screen.getAllByText('Marca Fit').length).toBeGreaterThan(1);
    expect(screen.getByText('https://marca.com')).toBeInTheDocument();
    expect(screen.getAllByText('marca@exemplo.com').length).toBeGreaterThan(0);
    expect(screen.queryByDisplayValue('marca@exemplo.com')).not.toBeInTheDocument();
  });

  it('abrir a row "Nichos" mostra os nichos do perfil selecionados no modal', () => {
    render(<ProfilePage />);
    fireEvent.click(screen.getByRole('button', { name: /^nichos/i }));
    const dialog = screen.getByRole('dialog', { name: 'Nichos' });

    // Afirma o estado por SEMÂNTICA, não por classe de cor: o seletor ganhou
    // `aria-pressed` na limpeza dos primitivos 2a (antes, quem usava leitor de
    // tela não tinha como saber o que estava marcado), e um teste preso ao hex
    // quebra a cada ajuste de paleta.
    expect(within(dialog).getByRole('button', { name: /^fitness$/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(dialog).getByRole('button', { name: /^wellness$/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(dialog).getByRole('button', { name: /^yoga$/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('mostra o preview ao vivo com o nome da marca', () => {
    render(<ProfilePage />);
    expect(screen.getByText('Campanha de')).toBeInTheDocument();
    expect(screen.getAllByText('Marca Fit').length).toBeGreaterThanOrEqual(1);
  });

  it('botão salvar da página começa desabilitado e habilita depois de editar um campo', () => {
    render(<ProfilePage />);
    const btn = screen.getByRole('button', { name: /^salvar$/i });
    expect(btn).toBeDisabled();

    editNameTo('Marca Renovada');
    expect(screen.getByRole('button', { name: /^salvar$/i })).toBeEnabled();
  });

  it('salva enviando o payload com os nichos selecionados', async () => {
    render(<ProfilePage />);

    toggleNicheInModal('crossfit');
    fireEvent.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Marca Fit',
          niches: ['fitness', 'wellness', 'crossfit'],
          website: 'https://marca.com',
          bio: 'Suplementos para creators.',
        }),
      ),
    );
  });

  it('habilita salvar ao alternar um nicho no modal (dirty)', () => {
    render(<ProfilePage />);
    const btn = screen.getByRole('button', { name: /^salvar$/i });
    expect(btn).toBeDisabled();

    toggleNicheInModal('crossfit');
    expect(btn).toBeEnabled();
  });
});

describe('ProfilePage — seção Conta', () => {
  it('mostra a row "Senha" na seção Conta', () => {
    render(<ProfilePage />);
    expect(screen.getByRole('button', { name: /^senha/i })).toBeInTheDocument();
  });

  it('clicar em "Senha" abre o modal de trocar senha', () => {
    render(<ProfilePage />);
    fireEvent.click(screen.getByRole('button', { name: /^senha/i }));
    expect(screen.getByRole('dialog', { name: /trocar senha/i })).toBeInTheDocument();
  });

  // Regressão: a seção Conta não participa do form de perfil — abrir/fechar
  // o modal de senha não pode habilitar o "Salvar" do perfil sem nada a salvar.
  it('abrir e fechar o modal de senha não habilita o "Salvar" do perfil', () => {
    render(<ProfilePage />);
    const saveButton = screen.getByRole('button', { name: /^salvar$/i });
    expect(saveButton).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /^senha/i }));
    fireEvent.click(screen.getByRole('button', { name: /^cancelar$/i }));

    expect(saveButton).toBeDisabled();
  });
});
