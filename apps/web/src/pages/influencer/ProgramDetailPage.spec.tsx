/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProgramDetailPage from './ProgramDetailPage';
import * as programHook from '../../hooks/useProgram';
import * as applicationHooks from '../../hooks/useMyApplications';
import type { Campaign, MyApplication } from '../../types/api';

vi.mock('../../hooks/useProgram', () => ({ useProgram: vi.fn() }));
vi.mock('../../hooks/useMyApplications', () => ({
  useMyApplications: vi.fn(),
  useCreateApplication: vi.fn(),
}));

function makeCampaign(over: Partial<Campaign> = {}): Campaign {
  return {
    id: 'camp-1',
    brandId: 'b1',
    title: 'Lançamento Whey',
    description: 'Poste 1 reel por semana durante o mês.',
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

function mockProgram(result: Partial<{ data: Campaign; isLoading: boolean; isError: boolean }>) {
  vi.mocked(programHook.useProgram).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    ...result,
  } as any);
}

function mockApplications(data: Partial<MyApplication>[] = []) {
  vi.mocked(applicationHooks.useMyApplications).mockReturnValue({ data } as any);
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/influencer/programs/camp-1']}>
      <Routes>
        <Route path="/influencer/programs/:id" element={<ProgramDetailPage />} />
        <Route path="/influencer/applications" element={<p>Minhas candidaturas</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(programHook.useProgram).mockReset();
  mockApplications();
  vi.mocked(applicationHooks.useCreateApplication).mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({ id: 'app-1' }),
    isPending: false,
  } as any);
});

describe('ProgramDetailPage', () => {
  it('mostra skeleton enquanto carrega', () => {
    mockProgram({ isLoading: true });
    const { container } = renderPage();
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('mostra erro quando o programa não existe', () => {
    mockProgram({ isError: true });
    renderPage();
    expect(screen.getByText(/programa não encontrado/i)).toBeInTheDocument();
  });

  it('mostra os detalhes do programa antes de qualquer candidatura', () => {
    mockProgram({ data: makeCampaign() });
    renderPage();

    expect(screen.getByRole('heading', { name: 'Lançamento Whey' })).toBeInTheDocument();
    expect(screen.getByText('Marca Fit')).toBeInTheDocument();
    expect(screen.getByText('R$ 500,00')).toBeInTheDocument();
    expect(screen.getByText(/poste 1 reel por semana/i)).toBeInTheDocument();
    expect(screen.getByText(/dias até o pagamento/i)).toBeInTheDocument();
    expect(screen.getByText('fitness')).toBeInTheDocument();
    // o modal só abre por ação da creator
    expect(screen.queryByPlaceholderText(/por que você é ideal/i)).not.toBeInTheDocument();
  });

  it('label da oferta segue o offerType (PRODUCT → envio)', () => {
    mockProgram({
      data: makeCampaign({
        offerType: 'PRODUCT' as any,
        offerAmount: null,
        offerDescription: 'Kit whey + shaker',
      }),
    });
    renderPage();

    expect(screen.getByText('Kit whey + shaker')).toBeInTheDocument();
    expect(screen.getByText(/dias até o envio/i)).toBeInTheDocument();
  });

  it('CTA abre o modal de candidatura', () => {
    mockProgram({ data: makeCampaign() });
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /quero participar/i }));

    expect(screen.getByPlaceholderText(/por que você é ideal/i)).toBeInTheDocument();
  });

  it('se já existe candidatura, mostra o status em vez do CTA', () => {
    mockProgram({ data: makeCampaign() });
    mockApplications([{ id: 'app-1', campaignId: 'camp-1', status: 'PENDING' as any }]);
    renderPage();

    expect(screen.getByText(/você já se candidatou a este programa/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /quero participar/i })).not.toBeInTheDocument();
  });

  it('programa não-ACTIVE não oferece candidatura', () => {
    mockProgram({ data: makeCampaign({ status: 'CLOSED' as any }) });
    renderPage();

    expect(screen.getByText(/inscrições encerradas/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /quero participar/i })).not.toBeInTheDocument();
  });
});
