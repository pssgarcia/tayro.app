/**
 * KineticPlate — as crop marks são a assinatura da identidade. `marks="top"`
 * existe porque placa com barra de ação na base esconderia as marcas de baixo
 * atrás de um bloco lime.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import KineticPlate from './KineticPlate';

function marksOf(container: HTMLElement) {
  return container.querySelectorAll('[aria-hidden].border-lime');
}

describe('KineticPlate', () => {
  it('desenha 4 crop marks por padrão', () => {
    const { container } = render(<KineticPlate>conteúdo</KineticPlate>);
    expect(marksOf(container)).toHaveLength(4);
  });

  it('desenha só as 2 de cima com marks="top"', () => {
    const { container } = render(<KineticPlate marks="top">conteúdo</KineticPlate>);
    expect(marksOf(container)).toHaveLength(2);
  });

  it('não desenha nenhuma com marks="none"', () => {
    const { container } = render(<KineticPlate marks="none">conteúdo</KineticPlate>);
    expect(marksOf(container)).toHaveLength(0);
  });

  it('rende o conteúdo', () => {
    render(<KineticPlate>7 candidaturas</KineticPlate>);
    expect(screen.getByText('7 candidaturas')).toBeInTheDocument();
  });

  // A Fila usa a placa como região de conteúdo, não como enfeite: o elemento
  // raiz precisa poder ser <section>.
  it('aceita trocar o elemento raiz', () => {
    const { container } = render(<KineticPlate as="section">conteúdo</KineticPlate>);
    expect(container.querySelector('section')).toBeInTheDocument();
  });

  // `flush` é o que permite a barra de ação colar na base sem respiro.
  it('tira o padding interno com flush', () => {
    const { container } = render(<KineticPlate flush>conteúdo</KineticPlate>);
    expect(container.firstElementChild).not.toHaveClass('p-6');
  });
});
