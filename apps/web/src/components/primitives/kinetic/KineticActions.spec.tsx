/**
 * KineticActions — a barra que substitui o `PlateActionBar`. O que precisa
 * ficar travado: ação com `to` navega (não vira botão morto), `disabled`
 * realmente bloqueia o clique, e existe exatamente um bloco primário.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import KineticActions from './KineticActions';

describe('KineticActions', () => {
  it('dispara o onClick da ação', () => {
    const onClick = vi.fn();
    render(<KineticActions actions={[{ label: 'Aprovar', onClick, primary: true }]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Aprovar' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('não dispara quando desabilitada', () => {
    const onClick = vi.fn();
    render(
      <KineticActions actions={[{ label: 'Aprovar', onClick, disabled: true, primary: true }]} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Aprovar' }));
    expect(onClick).not.toHaveBeenCalled();
  });

  // `to` existia no PlateActionBar e é usado por "Ver campanha"/"Ver detalhes":
  // se virar <button> sem href, o link deixa de abrir em nova aba e some do
  // teclado como link.
  it('renderiza <a> quando a ação é navegação', () => {
    render(
      <MemoryRouter>
        <KineticActions
          actions={[{ label: 'Ver detalhes', to: '/brand/campaigns/1', primary: true }]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Ver detalhes' })).toHaveAttribute(
      'href',
      '/brand/campaigns/1',
    );
  });

  // `href` é a variante da landing: WhatsApp é URL absoluta, e <Link> a
  // transformaria num caminho relativo quebrado.
  it('renderiza <a> em nova aba quando a ação é link externo', () => {
    render(
      <KineticActions
        actions={[{ label: 'Quero conversar', href: 'https://wa.me/5537999931492', primary: true }]}
      />,
    );

    const link = screen.getByRole('link', { name: 'Quero conversar' });
    expect(link).toHaveAttribute('href', 'https://wa.me/5537999931492');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('só o bloco primário fica em lime', () => {
    render(
      <KineticActions
        actions={[{ label: 'Copiar link' }, { label: 'Ver detalhes', primary: true }]}
      />,
    );

    expect(screen.getByRole('button', { name: 'Ver detalhes' })).toHaveClass('bg-lime');
    expect(screen.getByRole('button', { name: 'Copiar link' })).not.toHaveClass('bg-lime');
  });

  it('respeita type=submit (a barra é usada dentro de <form>)', () => {
    render(<KineticActions actions={[{ label: 'Entrar', type: 'submit', primary: true }]} />);
    expect(screen.getByRole('button', { name: 'Entrar' })).toHaveAttribute('type', 'submit');
  });
});
