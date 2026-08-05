/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

  it('preenche o form com os dados do perfil; email é texto (não input, somente leitura)', () => {
    render(<ProfilePage />);
    expect(screen.getByDisplayValue('Marca Fit')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://marca.com')).toBeInTheDocument();
    expect(screen.getAllByText('marca@exemplo.com').length).toBeGreaterThan(0);
    expect(screen.queryByDisplayValue('marca@exemplo.com')).not.toBeInTheDocument();
  });

  it('marca como selecionados os nichos do perfil (pills)', () => {
    render(<ProfilePage />);
    // pills dos nichos do perfil ficam com a classe lime; um não-selecionado não
    expect(screen.getByRole('button', { name: /^fitness$/i }).className).toMatch(
      /lime/,
    );
    expect(screen.getByRole('button', { name: /^wellness$/i }).className).toMatch(
      /lime/,
    );
    expect(screen.getByRole('button', { name: /^yoga$/i }).className).not.toMatch(
      /lime/,
    );
  });

  it('mostra o preview ao vivo com o nome da marca', () => {
    render(<ProfilePage />);
    expect(screen.getByText('Programa de')).toBeInTheDocument();
    // nome aparece no input E no preview
    expect(screen.getAllByText('Marca Fit').length).toBeGreaterThanOrEqual(1);
  });

  it('botão salvar começa desabilitado e habilita ao editar', () => {
    render(<ProfilePage />);
    const btn = screen.getByRole('button', { name: /^salvar$/i });
    expect(btn).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/nome da marca/i), {
      target: { value: 'Marca Renovada' },
    });
    expect(btn).toBeEnabled();
  });

  it('salva enviando o payload com os nichos selecionados', async () => {
    render(<ProfilePage />);

    // adiciona um nicho clicando no pill (perfil já tem fitness + wellness)
    fireEvent.click(screen.getByRole('button', { name: /^crossfit$/i }));
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

  it('habilita salvar ao alternar um nicho (dirty)', () => {
    render(<ProfilePage />);
    const btn = screen.getByRole('button', { name: /^salvar$/i });
    expect(btn).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /^crossfit$/i }));
    expect(btn).toBeEnabled();
  });
});
