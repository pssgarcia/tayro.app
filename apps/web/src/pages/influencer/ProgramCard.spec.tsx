/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProgramCard from './ProgramCard';
import type { Campaign } from '../../types/api';

function makeCampaign(over: Partial<Campaign> = {}): Campaign {
  return {
    id: 'camp-1',
    brandId: 'b1',
    title: 'Lançamento Whey',
    description: 'desc',
    briefUrl: null,
    status: 'ACTIVE' as any,
    niches: ['fitness'],
    maxSpots: 5,
    offerType: 'CASH' as any,
    offerAmount: 50000,
    offerDeadlineDays: 14,
    offerDescription: null,
    offerCommissionPercent: null,
    deadline: '2026-07-01T00:00:00.000Z',
    createdAt: '2026-06-01T00:00:00.000Z',
    brand: { name: 'Marca Fit', logoUrl: null, website: null },
    _count: { applications: 2 },
    ...over,
  };
}

function renderCard(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('ProgramCard', () => {
  it('leva ao detalhe do programa (não candidata direto)', () => {
    renderCard(<ProgramCard campaign={makeCampaign()} />);

    const link = screen.getByRole('link', { name: /lançamento whey/i });
    expect(link).toHaveAttribute('href', '/influencer/programs/camp-1');
    // o card não abre mais o modal de candidatura
    expect(screen.queryByText('Quero participar')).not.toBeInTheDocument();
  });

  it('mostra marca, vagas e oferta — o mesmo conteúdo pra todo programa', () => {
    renderCard(<ProgramCard campaign={makeCampaign()} />);

    expect(screen.getByText(/Marca Fit · 5 vagas/i)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*500/)).toBeInTheDocument();
  });

  it('singulariza "vaga" quando só há uma', () => {
    renderCard(<ProgramCard campaign={makeCampaign({ maxSpots: 1 })} />);

    expect(screen.getByText(/Marca Fit · 1 vaga$/i)).toBeInTheDocument();
  });

  it('não existe variação de destaque: todo programa renderiza a mesma linha', () => {
    const { container } = renderCard(<ProgramCard campaign={makeCampaign()} index={7} />);

    // índice mono 1-based, zero-padded — a única diferença entre as linhas
    expect(screen.getByText('07')).toBeInTheDocument();
    // nenhuma placa (KineticPlate renderiza as crop marks em lime sobre fundo claro)
    expect(container.querySelector('.bg-kinetic-light')).toBeNull();
    expect(screen.queryByRole('link', { name: /ver programa/i })).not.toBeInTheDocument();
  });

  it('usa hrefBuilder customizado quando informado (ex: visitante sem conta)', () => {
    renderCard(
      <ProgramCard
        campaign={makeCampaign({ id: 'camp-9' })}
        hrefBuilder={(id) => `/apply/${id}`}
      />,
    );

    expect(screen.getByRole('link', { name: /lançamento whey/i })).toHaveAttribute(
      'href',
      '/apply/camp-9',
    );
  });
});
