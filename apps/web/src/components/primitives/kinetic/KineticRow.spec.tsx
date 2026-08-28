/**
 * KineticRow — a linha do Kinetic é um ALVO, diferente das linhas do 2a que
 * eram texto inerte. Testes travam as três formas (inerte / botão / link) e o
 * estado de seleção, que é o que diz qual item está aberto na placa ao lado.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import KineticRow from './KineticRow';

describe('KineticRow', () => {
  it('sem onClick nem to, não é clicável', () => {
    render(<KineticRow title="Desafio Verão" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Desafio Verão')).toBeInTheDocument();
  });

  it('vira botão quando recebe onClick', () => {
    const onClick = vi.fn();
    render(<KineticRow title="Desafio Verão" onClick={onClick} />);

    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('vira link quando recebe to', () => {
    render(
      <MemoryRouter>
        <KineticRow title="Desafio Verão" to="/brand/campaigns/1" />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link')).toHaveAttribute('href', '/brand/campaigns/1');
  });

  it('formata o índice com zero à esquerda', () => {
    render(<KineticRow index={3} title="Desafio Verão" />);
    expect(screen.getByText('03')).toBeInTheDocument();
  });

  // aria-current é o que conta pra leitor de tela saber qual linha está aberta
  // — o fundo sozinho não comunica isso.
  it('marca a linha selecionada', () => {
    render(<KineticRow title="Desafio Verão" onClick={() => {}} selected />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-current', 'true');
  });

  it('mostra meta e trailing quando existem', () => {
    render(<KineticRow title="Desafio Verão" meta="Fit Foods" trailing={<span>Ativa</span>} />);
    expect(screen.getByText('Fit Foods')).toBeInTheDocument();
    expect(screen.getByText('Ativa')).toBeInTheDocument();
  });
});
