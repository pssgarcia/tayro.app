import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './LandingPage';
import { useAuthStore } from '../../stores/auth.store';

function renderAt(entry = '/') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/brand/dashboard" element={<div>painel da marca</div>} />
        <Route path="/influencer/dashboard" element={<div>painel da creator</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useAuthStore.setState({ accessToken: null, user: null, isInitialized: true });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('LandingPage', () => {
  it('com VITE_CONTACT_WHATSAPP: o CTA principal aponta pro wa.me com o número', () => {
    vi.stubEnv('VITE_CONTACT_WHATSAPP', '5537999931492');
    renderAt();

    const ctas = screen.getAllByRole('link', { name: /quero conversar/i });
    for (const cta of ctas) {
      expect(cta).toHaveAttribute('href', expect.stringContaining('https://wa.me/5537999931492'));
    }
  });

  it('sem a env: o CTA principal cai pra /register/brand e não vira link morto', () => {
    vi.stubEnv('VITE_CONTACT_WHATSAPP', '');
    renderAt();

    const ctas = screen.getAllByRole('link', { name: /quero conversar/i });
    expect(ctas.length).toBeGreaterThan(0);
    for (const cta of ctas) {
      expect(cta).toHaveAttribute('href', '/register/brand');
      expect(cta.getAttribute('href')).not.toBe('');
      expect(cta.getAttribute('href')).not.toBe('#');
    }
  });

  it('o CTA secundário e a faixa da creator levam pra /programs', () => {
    vi.stubEnv('VITE_CONTACT_WHATSAPP', '5537999931492');
    renderAt();

    const programLinks = screen
      .getAllByRole('link')
      .filter((l) => l.getAttribute('href') === '/programs');
    // hero (CTA secundário) + faixa da creator + footer
    expect(programLinks.length).toBeGreaterThanOrEqual(3);
  });

  it('marca logada em / é redirecionada pro painel da marca', () => {
    useAuthStore.setState({
      accessToken: 'tok',
      user: { id: 'b1', email: 'm@x.com', role: 'BRAND' },
      isInitialized: true,
    });
    renderAt();
    expect(screen.getByText('painel da marca')).toBeInTheDocument();
  });

  it('creator logada em / é redirecionada pro painel da creator', () => {
    useAuthStore.setState({
      accessToken: 'tok',
      user: { id: 'i1', email: 'c@x.com', role: 'INFLUENCER' },
      isInitialized: true,
    });
    renderAt();
    expect(screen.getByText('painel da creator')).toBeInTheDocument();
  });

  it('anônima vê a landing', () => {
    renderAt();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/decidir com quem trabalhar/i);
  });

  // ── Honestidade (vision.md / positioning.md) ──────────────────────────────
  // O risco desta página não é bug de render, é dizer o que o produto não é.
  // Trava a regra, não a redação: a landing não pode posicionar como pronto o
  // que não existe em produção (histórico verificado / transparência bilateral)
  // nem prometer discovery de creator.
  it('não posiciona features inexistentes nem discovery de creator', () => {
    renderAt();
    const texto = document.body.textContent ?? '';

    expect(texto).not.toMatch(/verificad/i); // "histórico verificado" — PartnershipResult não é escrito por ninguém
    expect(texto).not.toMatch(/garimp/i); // garimpar influenciador
    expect(texto).not.toMatch(/\bdescubr|\bdescobr/i); // "descubra creators"
    expect(texto).not.toMatch(/transpar[êe]ncia bilateral/i);
  });

  it('sustenta a página nos 3 diferenciais que existem em produção', () => {
    renderAt();
    const texto = (document.body.textContent ?? '').toLowerCase();

    expect(texto).toContain('instagram real'); // media kit vivo
    expect(texto).toContain('oferta já definida'); // oferta antes da candidatura
    expect(texto).toContain('sem precisar criar conta'); // candidatura sem conta prévia
  });
});
