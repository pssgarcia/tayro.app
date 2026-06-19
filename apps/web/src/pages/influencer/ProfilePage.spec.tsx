/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

  it('preenche o form com os dados do perfil', () => {
    render(<ProfilePage />);
    expect(screen.getByDisplayValue('Ana Silva')).toBeInTheDocument();
    expect(screen.getByDisplayValue('ana@exemplo.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Belo Horizonte')).toBeInTheDocument();
  });

  it('email é somente leitura', () => {
    render(<ProfilePage />);
    expect(screen.getByDisplayValue('ana@exemplo.com')).toBeDisabled();
  });

  it('botão salvar começa desabilitado e habilita ao editar', () => {
    render(<ProfilePage />);
    const btn = screen.getByRole('button', { name: /salvar alterações/i });
    expect(btn).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/^nome$/i), {
      target: { value: 'Ana Renovada' },
    });
    expect(btn).toBeEnabled();
  });

  it('o toggle de perfil público reflete o estado e habilita salvar ao alternar', () => {
    render(<ProfilePage />);
    const toggle = screen.getByRole('switch', {
      name: /tornar meu perfil público/i,
    });
    expect(toggle).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(
      screen.getByRole('button', { name: /salvar alterações/i }),
    ).toBeEnabled();
  });

  it('salva enviando publicProfileEnabled=true após ativar o toggle (LGPD)', async () => {
    render(<ProfilePage />);

    fireEvent.click(
      screen.getByRole('switch', { name: /tornar meu perfil público/i }),
    );
    fireEvent.click(screen.getByRole('button', { name: /salvar alterações/i }));

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
