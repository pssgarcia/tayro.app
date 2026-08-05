/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
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
  niches: ['fitness'],
  instagramHandle: 'anafit',
  tiktokHandle: null,
  followersCount: 1200,
  igEngagementRate: 4.2,
  igFetchStatus: 'OK',
  publicProfileEnabled: false,
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
    // "Ana Silva" aparece na placa-preview E na row "Nome"
    expect(screen.getAllByText('Ana Silva').length).toBeGreaterThan(1);
    expect(screen.getByText('Belo Horizonte')).toBeInTheDocument();
    expect(screen.getAllByText('ana@exemplo.com').length).toBeGreaterThan(0);
    expect(screen.queryByDisplayValue('ana@exemplo.com')).not.toBeInTheDocument();
  });

  it('clicar numa row abre um modal placa-formulário pra editar aquele campo', () => {
    render(<ProfilePage />);
    fireEvent.click(screen.getByRole('button', { name: /^nome/i }));
    const dialog = screen.getByRole('dialog', { name: 'Nome' });
    expect(within(dialog).getByLabelText('Nome')).toHaveValue('Ana Silva');
  });

  it('editar e salvar no modal atualiza a row e a placa em destaque (ao vivo após salvar)', () => {
    render(<ProfilePage />);
    editNameTo('Ana Renovada');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getAllByText('Ana Renovada').length).toBeGreaterThan(1);
    expect(screen.queryByText('Ana Silva')).not.toBeInTheDocument();
  });

  it('cancelar no modal não altera o valor', () => {
    render(<ProfilePage />);
    fireEvent.click(screen.getByRole('button', { name: /^nome/i }));
    const dialog = screen.getByRole('dialog', { name: 'Nome' });
    fireEvent.change(within(dialog).getByLabelText('Nome'), { target: { value: 'Rascunho' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /^cancelar$/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Rascunho')).not.toBeInTheDocument();
    expect(screen.getAllByText('Ana Silva').length).toBeGreaterThan(1);
  });

  it('botão salvar da página começa desabilitado e habilita depois de editar um campo', () => {
    render(<ProfilePage />);
    const btn = screen.getByRole('button', { name: /^salvar$/i });
    expect(btn).toBeDisabled();

    editNameTo('Ana Renovada');
    expect(screen.getByRole('button', { name: /^salvar$/i })).toBeEnabled();
  });

  it('o toggle de perfil público reflete o estado e habilita salvar ao alternar', () => {
    render(<ProfilePage />);
    const toggle = screen.getByRole('switch', {
      name: /tornar meu perfil público/i,
    });
    expect(toggle).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: /^salvar$/i })).toBeEnabled();
  });

  it('salva enviando publicProfileEnabled=true após ativar o toggle (LGPD)', async () => {
    render(<ProfilePage />);

    fireEvent.click(
      screen.getByRole('switch', { name: /tornar meu perfil público/i }),
    );
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
});
