import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from './LoginPage';
import { useAuthStore } from '../../stores/auth.store';

beforeEach(() => {
  useAuthStore.setState({ accessToken: null, user: null, isInitialized: true });
});

function renderPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  it('oferece um caminho pra ver campanhas abertas', () => {
    renderPage();

    const link = screen.getByRole('link', { name: /ver campanhas abertas/i });
    expect(link).toHaveAttribute('href', '/programs');
  });

  it('oferece "Esqueci minha senha?" apontando para /forgot-password', () => {
    renderPage();

    const link = screen.getByRole('link', { name: /esqueci minha senha/i });
    expect(link).toHaveAttribute('href', '/forgot-password');
  });

  // Regressão de mobile: com o tipo padrão da barra o rótulo custa ~160px e
  // meia barra em 360px tem ~156px, então a frase quebrava em duas linhas ao
  // lado do bloco lime. A fiação do `compact` é o que dá pra travar aqui —
  // jsdom não mede largura de texto.
  it('usa a barra compacta pro rótulo caber numa linha no celular', () => {
    renderPage();

    expect(screen.getByRole('link', { name: /esqueci minha senha/i })).toHaveClass(
      'text-[10px]',
      'sm:text-xs',
    );
  });
});
