import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import KineticSegments from './KineticSegments';

describe('KineticSegments', () => {
  it('desenha o total de segmentos pedido', () => {
    const { container } = render(<KineticSegments filled={3} total={12} />);
    expect(container.querySelectorAll('span')).toHaveLength(12);
  });

  // A barra é decorativa; quem usa leitor de tela precisa do número em texto.
  it('anuncia a proporção', () => {
    render(<KineticSegments filled={8} total={12} />);
    expect(screen.getByRole('img')).toHaveAccessibleName('8 de 12');
  });

  it('preenche só os primeiros N segmentos', () => {
    const { container } = render(<KineticSegments filled={2} total={5} />);
    const segmentos = Array.from(container.querySelectorAll('span'));
    expect(segmentos.filter((s) => s.classList.contains('bg-black'))).toHaveLength(2);
  });
});
