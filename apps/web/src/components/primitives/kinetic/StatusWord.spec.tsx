/**
 * StatusWord — a regra que este primitivo carrega não é cosmética: lime
 * significa "isto espera uma decisão sua". Se a cor virar decoração (tudo lime,
 * ou lime no que já foi decidido), a Fila perde o único sinal que diz onde
 * olhar. Por isso a cor é testada, não só o texto.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusWord from './StatusWord';

describe('StatusWord — rótulo em português por domínio', () => {
  it('usa o feminino da candidatura', () => {
    render(<StatusWord kind="application" status="APPROVED" />);
    expect(screen.getByText('Aprovada')).toBeInTheDocument();
  });

  // ContentStatus não é ApplicationStatus: concorda com "conteúdo", masculino.
  it('usa o masculino do conteúdo', () => {
    render(<StatusWord kind="content" status="APPROVED" />);
    expect(screen.getByText('Aprovado')).toBeInTheDocument();
  });

  it('usa o feminino da campanha', () => {
    render(<StatusWord kind="campaign" status="DRAFT" />);
    expect(screen.getByText('Rascunho')).toBeInTheDocument();
  });

  it('usa o feminino da recompensa', () => {
    render(<StatusWord kind="reward" status="ISSUED" />);
    expect(screen.getByText('Emitida')).toBeInTheDocument();
  });

  it('cobre REVISION_REQUESTED, que só existe em conteúdo', () => {
    render(<StatusWord kind="content" status="REVISION_REQUESTED" />);
    expect(screen.getByText('Revisar')).toBeInTheDocument();
  });
});

describe('StatusWord — lime só no que espera decisão', () => {
  it('pinta candidatura pendente de lime', () => {
    render(<StatusWord kind="application" status="PENDING" />);
    expect(screen.getByText('Pendente')).toHaveClass('text-lime');
  });

  it.each(['APPROVED', 'REJECTED', 'WITHDRAWN'] as const)(
    'não pinta de lime candidatura já decidida (%s)',
    (status) => {
      render(<StatusWord kind="application" status={status} />);
      expect(screen.getByText(/./)).not.toHaveClass('text-lime');
    },
  );

  it('pinta conteúdo em análise de lime, e aprovado não', () => {
    const { unmount } = render(<StatusWord kind="content" status="PENDING" />);
    expect(screen.getByText('Em análise')).toHaveClass('text-lime');
    unmount();

    render(<StatusWord kind="content" status="APPROVED" />);
    expect(screen.getByText('Aprovado')).not.toHaveClass('text-lime');
  });

  // Recompensa é o único domínio com dois estados acionáveis: PENDING pede
  // emitir, ISSUED pede confirmar entrega. Só a entregue apaga.
  it.each(['PENDING', 'ISSUED'] as const)('pinta recompensa %s de lime', (status) => {
    render(<StatusWord kind="reward" status={status} />);
    expect(screen.getByText(/./)).toHaveClass('text-lime');
  });

  it('não pinta de lime recompensa entregue', () => {
    render(<StatusWord kind="reward" status="DELIVERED" />);
    expect(screen.getByText('Entregue')).not.toHaveClass('text-lime');
  });

  // Na campanha o que "pede atenção" é a que está no ar recebendo candidatura,
  // não a pendente — rascunho é trabalho parado, não decisão esperando.
  it('pinta campanha ativa de lime, e rascunho não', () => {
    const { unmount } = render(<StatusWord kind="campaign" status="ACTIVE" />);
    expect(screen.getByText('Ativa')).toHaveClass('text-lime');
    unmount();

    render(<StatusWord kind="campaign" status="DRAFT" />);
    expect(screen.getByText('Rascunho')).not.toHaveClass('text-lime');
  });
});
