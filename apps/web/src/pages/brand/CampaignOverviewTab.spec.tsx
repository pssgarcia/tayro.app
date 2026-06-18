import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CampaignOverviewTab from './CampaignOverviewTab';
import type { Campaign } from '../../types/api';

const baseCampaign: Campaign = {
  id: 'camp-1',
  brandId: 'brand-1',
  title: 'Programa Verão',
  description: 'Queremos creators autênticas para o lançamento.',
  briefUrl: 'https://example.com/brief.pdf',
  status: 'ACTIVE',
  niches: ['fitness', 'lifestyle'],
  maxSpots: 10,
  offerType: 'CASH',
  offerAmount: 30_000,
  offerDeadlineDays: 30,
  offerDescription: null,
  deadline: '2026-07-15T00:00:00.000Z',
  createdAt: '2026-06-01T00:00:00.000Z',
  _count: { applications: 3 },
};

describe('CampaignOverviewTab', () => {
  it('mostra a descrição e os nichos do programa', () => {
    render(<CampaignOverviewTab campaign={baseCampaign} approvedCount={3} />);
    expect(
      screen.getByText(/creators autênticas para o lançamento/i),
    ).toBeInTheDocument();
    expect(screen.getByText('fitness')).toBeInTheDocument();
    expect(screen.getByText('lifestyle')).toBeInTheDocument();
  });

  it('mostra a oferta em dinheiro formatada e o prazo', () => {
    render(<CampaignOverviewTab campaign={baseCampaign} approvedCount={3} />);
    expect(screen.getByText('Pagamento')).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?300,00/)).toBeInTheDocument();
    expect(screen.getByText('30 dias após aprovação')).toBeInTheDocument();
  });

  it('mostra o progresso de vagas (aprovadas/total)', () => {
    render(<CampaignOverviewTab campaign={baseCampaign} approvedCount={3} />);
    expect(screen.getByText('3/10')).toBeInTheDocument();
  });

  it('linka o briefing quando há briefUrl', () => {
    render(<CampaignOverviewTab campaign={baseCampaign} approvedCount={0} />);
    const link = screen.getByRole('link', { name: /ver briefing/i });
    expect(link).toHaveAttribute('href', 'https://example.com/brief.pdf');
  });

  it('para oferta PRODUCT, mostra a descrição do produto como valor', () => {
    const productCampaign: Campaign = {
      ...baseCampaign,
      offerType: 'PRODUCT',
      offerAmount: null,
      offerDescription: 'Kit Whey 900g + coqueteleira',
    };
    render(<CampaignOverviewTab campaign={productCampaign} approvedCount={1} />);
    // "Produto" aparece como valor do Tipo e como label do StatBlock
    expect(screen.getAllByText('Produto').length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText('Kit Whey 900g + coqueteleira'),
    ).toBeInTheDocument();
  });
});
