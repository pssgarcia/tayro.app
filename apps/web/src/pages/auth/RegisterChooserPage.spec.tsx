import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RegisterChooserPage from './RegisterChooserPage';

// Tela de bifurcação do cadastro. É estática, então o que importa travar é o
// destino de cada saída: mandar a creator pro fluxo de marca (ou o contrário)
// cria a conta com o papel errado, e não existe troca de papel no produto.

function renderPage() {
  return render(
    <MemoryRouter>
      <RegisterChooserPage />
    </MemoryRouter>,
  );
}

describe('RegisterChooserPage', () => {
  it('oferece os dois caminhos de cadastro', () => {
    renderPage();

    expect(screen.getByText('Sou creator')).toBeInTheDocument();
    expect(screen.getByText('Sou marca')).toBeInTheDocument();
  });

  it('leva a creator para o cadastro de creator', () => {
    renderPage();

    expect(screen.getByRole('link', { name: /criar conta de creator/i })).toHaveAttribute(
      'href',
      '/register/influencer',
    );
  });

  it('leva a marca para o cadastro de marca', () => {
    renderPage();

    expect(screen.getByRole('link', { name: /criar conta de marca/i })).toHaveAttribute(
      'href',
      '/register/brand',
    );
  });

  it('oferece saída para quem já tem conta', () => {
    renderPage();

    expect(screen.getByRole('link', { name: /entrar/i })).toHaveAttribute('href', '/login');
  });
});
