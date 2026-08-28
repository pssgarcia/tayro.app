import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CampaignCard from './CampaignCard';
import { campaignFixture } from '../../test/fixtures/applications';
import type { Campaign } from '../../types/api';

const navigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigate };
});

function makeCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    ...campaignFixture,
    title: 'Campanha Verão',
    maxSpots: 5,
    approvedCount: 2,
    pendingCount: 3,
    _count: { applications: 7 },
    ...overrides,
  };
}

function renderCard(props: {
  campaign?: Partial<Campaign>;
  variant?: 'row' | 'featured';
  index?: number;
}) {
  return render(
    <MemoryRouter>
      <CampaignCard
        campaign={makeCampaign(props.campaign)}
        variant={props.variant}
        index={props.index}
      />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CampaignCard — variant row', () => {
  it('mostra título, contagem de candidaturas e vagas', () => {
    renderCard({ variant: 'row' });

    expect(screen.getByText('Campanha Verão')).toBeInTheDocument();
    expect(screen.getByText(/7 candidaturas · 5 vagas/i)).toBeInTheDocument();
  });

  // Rascunho não tem link público, então contar candidatura ali seria mentira.
  it('em DRAFT diz que não há link publicado, em vez de contar candidaturas', () => {
    renderCard({ variant: 'row', campaign: { status: 'DRAFT' } });

    expect(screen.getByText(/sem link publicado/i)).toBeInTheDocument();
    expect(screen.queryByText(/candidatura/i)).not.toBeInTheDocument();
  });

  it('faz singular quando há uma candidatura e uma vaga', () => {
    renderCard({
      variant: 'row',
      campaign: { maxSpots: 1, _count: { applications: 1 } },
    });

    expect(screen.getByText(/1 candidatura · 1 vaga/i)).toBeInTheDocument();
    expect(screen.queryByText(/candidaturas/i)).not.toBeInTheDocument();
  });

  it('numera a linha com dois dígitos', () => {
    renderCard({ variant: 'row', index: 3 });

    expect(screen.getByText('03')).toBeInTheDocument();
  });

  it('abre o detalhe da campanha ao clicar', () => {
    renderCard({ variant: 'row' });

    fireEvent.click(screen.getByRole('button'));

    expect(navigate).toHaveBeenCalledWith('/brand/campaigns/camp-1');
  });
});

describe('CampaignCard — variant featured', () => {
  it('mostra vagas preenchidas sobre o total e quantas estão na fila', () => {
    renderCard({ variant: 'featured' });

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('/5')).toBeInTheDocument();
    expect(screen.getByText(/3 na fila/i)).toBeInTheDocument();
  });

  it('mostra "Sem prazo" quando a campanha não tem deadline', () => {
    renderCard({ variant: 'featured', campaign: { deadline: null } });

    expect(screen.getByText(/sem prazo/i)).toBeInTheDocument();
  });

  it('trata contadores ausentes como zero (a listagem pública não os traz)', () => {
    renderCard({
      variant: 'featured',
      campaign: { approvedCount: undefined, pendingCount: undefined },
    });

    expect(screen.getByText(/0 na fila/i)).toBeInTheDocument();
  });

  it('leva ao detalhe da campanha', () => {
    renderCard({ variant: 'featured' });

    fireEvent.click(screen.getByRole('button', { name: /ver detalhes/i }));

    expect(navigate).toHaveBeenCalledWith('/brand/campaigns/camp-1');
  });
});

// O link de candidatura é o que a marca manda pras creators — copiar a URL
// errada quebra a campanha inteira em silêncio.
describe('CampaignCard — copiar link público', () => {
  let writeText: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    writeText = vi.fn();
    Object.assign(navigator, { clipboard: { writeText } });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('copia a URL pública absoluta da campanha', () => {
    renderCard({ variant: 'featured' });

    fireEvent.click(screen.getByRole('button', { name: /copiar link/i }));

    expect(writeText).toHaveBeenCalledWith('http://localhost:3000/apply/camp-1');
  });

  it('confirma a cópia e volta ao rótulo original depois de 2s', () => {
    renderCard({ variant: 'featured' });

    fireEvent.click(screen.getByRole('button', { name: /copiar link/i }));
    expect(screen.getByRole('button', { name: /copiado/i })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByRole('button', { name: /copiar link/i })).toBeInTheDocument();
  });
});
