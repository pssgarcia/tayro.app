import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SentryFallback from './SentryFallback';

describe('SentryFallback', () => {
  it('mostra a mensagem de erro registrado', () => {
    render(<SentryFallback onReset={() => {}} />);
    expect(screen.getByText(/algo quebrou nesta tela/i)).toBeInTheDocument();
    expect(screen.getByText(/o erro foi registrado/i)).toBeInTheDocument();
  });

  it('o botão Recarregar chama onReset', async () => {
    const onReset = vi.fn();
    render(<SentryFallback onReset={onReset} />);

    await userEvent.click(screen.getByRole('button', { name: /recarregar/i }));

    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
