import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import KineticTabs from './KineticTabs';

const TABS = [
  { id: 'queue', label: 'Fila' },
  { id: 'briefing', label: 'Briefing' },
] as const;

describe('KineticTabs', () => {
  it('avisa qual aba foi escolhida', () => {
    const onChange = vi.fn();
    render(<KineticTabs tabs={TABS} active="queue" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Briefing' }));
    expect(onChange).toHaveBeenCalledWith('briefing');
  });

  it('marca a aba ativa', () => {
    render(<KineticTabs tabs={TABS} active="briefing" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Briefing' })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  // A caixa alta é do CSS: o rótulo no DOM continua "Briefing".
  it('mantém o rótulo como escrito', () => {
    render(<KineticTabs tabs={TABS} active="queue" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Briefing' }).textContent).toBe('Briefing');
  });

  // Em 360px as 4 abas do detalhe não cabem — a faixa precisa rolar, não cortar.
  it('deixa a faixa rolar na horizontal', () => {
    const { container } = render(<KineticTabs tabs={TABS} active="queue" onChange={() => {}} />);
    expect(container.firstElementChild).toHaveClass('overflow-x-auto');
  });
});
