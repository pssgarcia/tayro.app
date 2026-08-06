/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ApplyModal from './ApplyModal';
import * as applicationHooks from '../../hooks/useMyApplications';

vi.mock('../../hooks/useMyApplications', () => ({
  useCreateApplication: vi.fn(),
}));

const campaign = { id: 'camp-1', title: 'Lançamento Whey', brand: { name: 'Marca Fit' } };
const mutateAsync = vi.fn();
const onClose = vi.fn();

beforeEach(() => {
  mutateAsync.mockReset();
  onClose.mockReset();
  vi.mocked(applicationHooks.useCreateApplication).mockReturnValue({
    mutateAsync,
    isPending: false,
  } as any);
});

describe('ApplyModal', () => {
  it('confirmar chama a mutation com campaignId e mensagem, mostra sucesso', async () => {
    mutateAsync.mockResolvedValueOnce({ id: 'app-1' });
    render(<ApplyModal campaign={campaign} onClose={onClose} />);

    fireEvent.change(screen.getByPlaceholderText(/por que você é ideal/i), {
      target: { value: 'Amo fitness!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^confirmar$/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        campaignId: 'camp-1',
        message: 'Amo fitness!',
      });
    });
    expect(screen.getByText(/candidatura enviada/i)).toBeInTheDocument();
  });

  it('confirmar sem mensagem envia message: undefined', async () => {
    mutateAsync.mockResolvedValueOnce({ id: 'app-1' });
    render(<ApplyModal campaign={campaign} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /^confirmar$/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({ campaignId: 'camp-1', message: undefined });
    });
  });

  it('409 (já se candidatou) mostra erro inline e mantém o form', async () => {
    mutateAsync.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 409, data: { message: 'Você já se candidatou a este programa' } },
    });
    render(<ApplyModal campaign={campaign} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /^confirmar$/i }));

    expect(await screen.findByText(/você já se candidatou a este programa/i)).toBeInTheDocument();
    expect(screen.queryByText(/candidatura enviada/i)).not.toBeInTheDocument();
  });

  it('erro genérico (sem response) mostra mensagem de fallback', async () => {
    mutateAsync.mockRejectedValueOnce(new Error('network down'));
    render(<ApplyModal campaign={campaign} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /^confirmar$/i }));

    expect(await screen.findByText(/não foi possível enviar sua candidatura/i)).toBeInTheDocument();
  });

  it('Cancelar fecha sem chamar a mutation', () => {
    render(<ApplyModal campaign={campaign} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /^cancelar$/i }));

    expect(onClose).toHaveBeenCalled();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('depois de enviar, o CTA de sucesso dispara onApplied', async () => {
    mutateAsync.mockResolvedValueOnce({ id: 'app-1' });
    const onApplied = vi.fn();
    render(<ApplyModal campaign={campaign} onClose={onClose} onApplied={onApplied} />);

    fireEvent.click(screen.getByRole('button', { name: /^confirmar$/i }));
    fireEvent.click(await screen.findByRole('button', { name: /ver minhas candidaturas/i }));

    expect(onApplied).toHaveBeenCalled();
  });
});
