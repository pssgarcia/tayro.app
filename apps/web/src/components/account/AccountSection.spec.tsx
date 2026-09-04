/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AccountSection from './AccountSection';
import { api } from '../../services/api';

vi.mock('../../services/api', () => ({
  api: { get: vi.fn() },
}));

// jsdom não implementa Blob URL nem navegação de <a download> — mockamos os
// dois pra testar só o comportamento do componente, não o browser.
let createObjectURLSpy: ReturnType<typeof vi.fn>;
let revokeObjectURLSpy: ReturnType<typeof vi.fn>;
let clickSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.mocked(api.get).mockReset();
  createObjectURLSpy = vi.fn().mockReturnValue('blob:mock-url');
  revokeObjectURLSpy = vi.fn();
  (globalThis as any).URL.createObjectURL = createObjectURLSpy;
  (globalThis as any).URL.revokeObjectURL = revokeObjectURLSpy;
  clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});

afterEach(() => {
  clickSpy.mockRestore();
});

describe('AccountSection', () => {
  it('mostra as rows Senha, E-mail e Exportar meus dados', () => {
    render(<AccountSection email="ana@exemplo.com" role="INFLUENCER" />);

    expect(screen.getByRole('button', { name: /^senha/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^e-mail/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /exportar meus dados/i })).toBeInTheDocument();
  });

  it('creator: exportar chama GET /influencers/me/export e baixa o arquivo', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { profile: { name: 'Ana' } } } as any);
    render(<AccountSection email="ana@exemplo.com" role="INFLUENCER" />);

    fireEvent.click(screen.getByRole('button', { name: /exportar meus dados/i }));

    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/influencers/me/export'));
    await waitFor(() => expect(createObjectURLSpy).toHaveBeenCalled());
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
    await screen.findByText(/baixado/i);
  });

  it('marca: exportar chama GET /brands/me/export', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { profile: { name: 'Marca' } } } as any);
    render(<AccountSection email="marca@exemplo.com" role="BRAND" />);

    fireEvent.click(screen.getByRole('button', { name: /exportar meus dados/i }));

    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/brands/me/export'));
  });

  it('erro na exportação mostra mensagem, sem quebrar a tela', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('network'));
    render(<AccountSection email="ana@exemplo.com" role="INFLUENCER" />);

    fireEvent.click(screen.getByRole('button', { name: /exportar meus dados/i }));

    expect(await screen.findByText(/erro ao exportar/i)).toBeInTheDocument();
  });

  it('clicar em Senha abre o modal de trocar senha', () => {
    render(<AccountSection email="ana@exemplo.com" role="INFLUENCER" />);
    fireEvent.click(screen.getByRole('button', { name: /^senha/i }));
    expect(screen.getByRole('dialog', { name: /trocar senha/i })).toBeInTheDocument();
  });
});
