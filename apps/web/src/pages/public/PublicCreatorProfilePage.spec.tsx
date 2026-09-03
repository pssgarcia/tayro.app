/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PublicCreatorProfilePage from './PublicCreatorProfilePage';
import * as profileHook from '../../hooks/usePublicCreatorProfile';
import type { PublicCreatorProfile } from '../../types/api';

vi.mock('../../hooks/usePublicCreatorProfile', () => ({
  usePublicCreatorProfile: vi.fn(),
}));

function makeProfile(over: Partial<PublicCreatorProfile> = {}): PublicCreatorProfile {
  return {
    id: 'inf-1',
    handle: 'anaflavia',
    name: 'Ana Flávia',
    avatarUrl: null,
    igProfilePicUrl: null,
    bio: 'Fitness e nutrição no dia a dia.',
    niches: ['fitness', 'nutrição'],
    city: 'Belo Horizonte',
    followersCount: 12000,
    igEngagementRate: 4.2,
    igRecentPosts: [
      { url: 'https://ig.com/p1', thumbnail: 'https://ig.com/t1.jpg', likes: 10, comments: 2 },
    ],
    igFetchStatus: 'OK',
    phone: null,
    completedPartnerships: 3,
    results: [],
    ...over,
  };
}

function mockProfile(
  result: Partial<{ data: PublicCreatorProfile; isLoading: boolean; isError: boolean }>,
) {
  vi.mocked(profileHook.usePublicCreatorProfile).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    ...result,
  } as any);
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/c/anaflavia']}>
      <Routes>
        <Route path="/c/:handle" element={<PublicCreatorProfilePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(profileHook.usePublicCreatorProfile).mockReset();
});

describe('PublicCreatorProfilePage', () => {
  it('mostra skeleton enquanto carrega', () => {
    mockProfile({ isLoading: true });
    const { container } = renderPage();
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('perfil inexistente e perfil privado mostram a MESMA mensagem genérica (anti-enumeração)', () => {
    mockProfile({ isError: true });
    renderPage();

    expect(screen.getByText(/este perfil não está disponível/i)).toBeInTheDocument();
    // não pode vazar pista de qual dos dois motivos é
    expect(screen.queryByText(/não encontrado/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/privado/i)).not.toBeInTheDocument();
  });

  it('mostra identidade, niches e bio', () => {
    mockProfile({ data: makeProfile() });
    renderPage();

    expect(screen.getByText('Ana Flávia')).toBeInTheDocument();
    expect(screen.getByText('@anaflavia')).toBeInTheDocument();
    expect(screen.getByText('Belo Horizonte')).toBeInTheDocument();
    expect(screen.getByText('fitness')).toBeInTheDocument();
    expect(screen.getByText('nutrição')).toBeInTheDocument();
    expect(screen.getByText(/fitness e nutrição no dia a dia/i)).toBeInTheDocument();
  });

  it('link do @handle aponta pro Instagram real', () => {
    mockProfile({ data: makeProfile() });
    renderPage();

    const link = screen.getByText('@anaflavia').closest('a');
    expect(link).toHaveAttribute('href', 'https://instagram.com/anaflavia');
  });

  it('mostra seguidores e engajamento quando igFetchStatus=OK', () => {
    mockProfile({ data: makeProfile() });
    renderPage();

    expect(screen.getByText('seguidores')).toBeInTheDocument();
    expect(screen.getByText('engajamento')).toBeInTheDocument();
  });

  it('igFetchStatus=FAILED mostra fallback discreto, sem botão de atualizar e sem quebrar a página', () => {
    mockProfile({ data: makeProfile({ igFetchStatus: 'FAILED' }) });
    renderPage();

    expect(screen.getByText(/dados do instagram indisponíveis/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /atualizar/i })).not.toBeInTheDocument();
    // parcerias concluídas é independente do IG — continua visível
    expect(screen.getByText('parcerias concluídas')).toBeInTheDocument();
  });

  it('igFetchStatus=PENDING mostra skeleton dos stats, sem quebrar a página', () => {
    mockProfile({
      data: makeProfile({ igFetchStatus: 'PENDING', followersCount: null, igEngagementRate: null }),
    });
    const { container } = renderPage();

    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    expect(screen.getByText('parcerias concluídas')).toBeInTheDocument();
  });

  it('destaca parcerias concluídas como prova social', () => {
    mockProfile({ data: makeProfile({ completedPartnerships: 7 }) });
    renderPage();

    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('parcerias concluídas')).toBeInTheDocument();
  });

  it('mostra grade de conteúdo recente quando há posts', () => {
    mockProfile({ data: makeProfile() });
    renderPage();

    expect(screen.getByText(/conteúdo recente/i)).toBeInTheDocument();
  });

  it('omite a seção de conteúdo recente quando não há posts', () => {
    mockProfile({ data: makeProfile({ igRecentPosts: [] }) });
    renderPage();

    expect(screen.queryByText(/conteúdo recente/i)).not.toBeInTheDocument();
  });

  it('CTA final leva para /register/brand com o nome da creator', () => {
    mockProfile({ data: makeProfile() });
    renderPage();

    expect(screen.getByText(/quer creators como ana flávia/i)).toBeInTheDocument();
    const cta = screen.getByRole('link', { name: /crie sua campanha/i });
    expect(cta).toHaveAttribute('href', '/register/brand');
  });

  // ─── CTA do rodapé ──────────────────────────────────────────────────────
  // O telefone só chega aqui quando a creator ligou o opt-in de telefone
  // público (a API devolve null sem ele) — ver specs/public-creator-profile.

  it('com telefone, o CTA vira "Falar no WhatsApp" e o cadastro de marca fica como saída secundária', () => {
    mockProfile({ data: makeProfile({ phone: '(11) 91234-5678' }) });
    renderPage();

    expect(screen.getByRole('link', { name: /falar no whatsapp/i })).toHaveAttribute(
      'href',
      'https://wa.me/5511912345678',
    );
    expect(screen.getByRole('link', { name: /crie sua campanha no tayro/i })).toHaveAttribute(
      'href',
      '/register/brand',
    );
    expect(screen.queryByText(/quer creators como/i)).not.toBeInTheDocument();
  });

  it('sem telefone, o CTA segue sendo "Crie sua campanha"', () => {
    mockProfile({ data: makeProfile({ phone: null }) });
    renderPage();

    expect(screen.queryByRole('link', { name: /whatsapp/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^crie sua campanha$/i })).toBeInTheDocument();
  });

  // Telefone que a heurística não consegue converter não vira link quebrado:
  // cai no CTA de sempre (mesma regra da placa em /brand/creators).
  it('telefone que não produz link válido cai no CTA de sempre', () => {
    mockProfile({ data: makeProfile({ phone: '123' }) });
    renderPage();

    expect(screen.queryByRole('link', { name: /whatsapp/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^crie sua campanha$/i })).toBeInTheDocument();
  });

  it('usa o proxy same-origin quando igProfilePicUrl existe', () => {
    mockProfile({
      data: makeProfile({ igProfilePicUrl: 'https://scontent.cdninstagram.com/pic.jpg' }),
    });
    const { container } = renderPage();

    // alt="" tira o role="img" implícito (decorativo) — precisa de querySelector.
    // primeira <img> renderizada na página é o avatar do hero.
    const avatar = container.querySelector('img');
    expect(avatar).toHaveAttribute('src', '/api/v1/ig/avatar/inf-1');
  });

  it('sem igProfilePicUrl, cai no avatarUrl; sem nenhum dos dois, mostra iniciais', () => {
    mockProfile({ data: makeProfile({ igProfilePicUrl: null, avatarUrl: null }) });
    renderPage();

    expect(screen.getByText('AF')).toBeInTheDocument();
  });
});
