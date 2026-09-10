import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import ScrollToTop from './ScrollToTop';

// MORDEU 2026-09-09: o roteador é declarativo (<Routes>/<Route>), sem o
// <ScrollRestoration> nativo do react-router (só existe pro data router).
// Clicar num link no rodapé de uma página rolada mantinha a posição de
// scroll na página seguinte — quem ia dos Termos de Uso pra Política de
// Privacidade caía no meio do documento novo, não no topo.
function Page({ label, to }: { label: string; to: string }) {
  return (
    <div>
      <p>{label}</p>
      <Link to={to}>ir</Link>
    </div>
  );
}

function renderApp(initialEntry = '/a') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ScrollToTop />
      <Routes>
        <Route path="/a" element={<Page label="página a" to="/b" />} />
        <Route path="/b" element={<Page label="página b" to="/a" />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ScrollToTop', () => {
  let scrollTo: ReturnType<typeof vi.fn<(x: number, y: number) => void>>;

  beforeEach(() => {
    scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rola para o topo ao navegar pra uma rota nova (clique em link)', () => {
    renderApp('/a');
    scrollTo.mockClear(); // ignora a chamada da montagem inicial

    fireEvent.click(screen.getByRole('link', { name: 'ir' }));

    expect(screen.getByText('página b')).toBeInTheDocument();
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('não mexe no scroll quando a rota não muda', () => {
    const { rerender } = renderApp('/a');
    scrollTo.mockClear();

    rerender(
      <MemoryRouter initialEntries={['/a']}>
        <ScrollToTop />
        <Routes>
          <Route path="/a" element={<Page label="página a" to="/b" />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(scrollTo).not.toHaveBeenCalled();
  });
});
