/**
 * StatFigure — inverte a ordem do `StatBlock` do 2a: rótulo EM CIMA, número
 * embaixo (a ordem que a Fila usa). A ordem é testada porque é o que muda a
 * leitura da tela, e porque teste antigo que dependia de `previousElementSibling`
 * quebraria em silêncio se ela voltasse.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatFigure from './StatFigure';

describe('StatFigure', () => {
  it('mostra rótulo e valor', () => {
    render(<StatFigure label="em análise" value={3} />);
    expect(screen.getByText('em análise')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('põe o rótulo ANTES do número no DOM', () => {
    const { container } = render(<StatFigure label="em análise" value={3} />);
    const texto = container.textContent ?? '';
    expect(texto.indexOf('em análise')).toBeLessThan(texto.indexOf('3'));
  });

  // O rótulo sobe pra caixa alta por CSS: o texto no DOM segue minúsculo, então
  // busca por texto em teste e em leitor de tela continua funcionando.
  it('mantém o rótulo em minúsculas no DOM', () => {
    render(<StatFigure label="conteúdos a revisar" value={5} />);
    const rotulo = screen.getByText('conteúdos a revisar');
    expect(rotulo).toHaveClass('uppercase');
    expect(rotulo.textContent).toBe('conteúdos a revisar');
  });

  it('pinta de lime só quando é destaque', () => {
    const { unmount } = render(<StatFigure label="a receber" value={2} highlight />);
    expect(screen.getByText('a receber')).toHaveClass('text-lime');
    unmount();

    render(<StatFigure label="em análise" value={3} />);
    expect(screen.getByText('em análise')).not.toHaveClass('text-lime');
  });

  it('mostra a linha de apoio quando existe', () => {
    render(<StatFigure label="campanhas" value={4} sub="3 ativas" />);
    expect(screen.getByText('3 ativas')).toBeInTheDocument();
  });
});
