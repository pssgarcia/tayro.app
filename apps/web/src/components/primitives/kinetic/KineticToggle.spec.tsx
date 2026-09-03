import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KineticToggle from './KineticToggle';

describe('KineticToggle', () => {
  it('expõe estado como switch, não só por cor', () => {
    render(
      <KineticToggle checked onChange={() => {}} label="Perfil público" />,
    );

    const toggle = screen.getByRole('switch', { name: 'Perfil público' });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('desligado tem aria-checked false', () => {
    render(
      <KineticToggle
        checked={false}
        onChange={() => {}}
        label="Perfil público"
      />,
    );

    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });

  it('inverte o valor ao clicar', async () => {
    const onChange = vi.fn();
    render(
      <KineticToggle checked={false} onChange={onChange} label="Publicar" />,
    );

    await userEvent.click(screen.getByRole('switch'));

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('não dispara quando desabilitado', async () => {
    const onChange = vi.fn();
    render(
      <KineticToggle
        checked={false}
        onChange={onChange}
        label="Publicar"
        disabled
      />,
    );

    await userEvent.click(screen.getByRole('switch'));

    expect(onChange).not.toHaveBeenCalled();
  });
});
