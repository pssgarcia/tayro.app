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
  it('placa em destaque leva ao detalhe do programa (não candidata direto)', () => {
    renderCard(<ProgramCard campaign={makeCampaign()} variant="featured" />);

    const link = screen.getByRole('link', { name: /ver programa/i });
    expect(link).toHaveAttribute('href', '/influencer/programs/camp-1');
    // o card não abre mais o modal de candidatura
    expect(screen.queryByText('Quero participar')).not.toBeInTheDocument();
  });

  it('row leva ao detalhe do programa', () => {
    renderCard(<ProgramCard campaign={makeCampaign({ id: 'camp-9' })} />);

    expect(screen.getByRole('link', { name: /lançamento whey/i })).toHaveAttribute(
      'href',
      '/influencer/programs/camp-9',
    );
  });

  it('mostra a oferta e a marca na placa em destaque', () => {
    renderCard(<ProgramCard campaign={makeCampaign()} variant="featured" />);

    expect(screen.getByText('Marca Fit')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.getByText(/5 vagas/i)).toBeInTheDocument();
  });

  it('featured usa hrefBuilder customizado quando informado (ex: visitante sem conta)', () => {
    renderCard(
      <ProgramCard
        campaign={makeCampaign()}
        variant="featured"
        hrefBuilder={(id) => `/apply/${id}`}
      />,
    );

    expect(screen.getByRole('link', { name: /ver programa/i })).toHaveAttribute(
      'href',
      '/apply/camp-1',
    );
  });

  it('row usa hrefBuilder customizado quando informado', () => {
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
