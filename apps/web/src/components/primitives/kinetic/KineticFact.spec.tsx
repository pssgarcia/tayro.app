import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import KineticFact from './KineticFact';

describe('KineticFact', () => {
  it('mostra rótulo e valor', () => {
    render(<KineticFact label="Prazo de pagamento" value="30 dias após aprovação" />);
    expect(screen.getByText('Prazo de pagamento')).toBeInTheDocument();
    expect(screen.getByText('30 dias após aprovação')).toBeInTheDocument();
  });

  // Mesma regra do StatFigure: a caixa alta é do CSS, não do texto.
  it('mantém o rótulo em minúsculas no DOM', () => {
    render(<KineticFact label="Criado em" value="01/06/2026" />);
    const rotulo = screen.getByText('Criado em');
    expect(rotulo).toHaveClass('uppercase');
    expect(rotulo.textContent).toBe('Criado em');
  });

  it('aceita nó como valor', () => {
    render(<KineticFact label="Total" value={<span>R$ 3.000,00</span>} />);
    expect(screen.getByText('R$ 3.000,00')).toBeInTheDocument();
  });
});
