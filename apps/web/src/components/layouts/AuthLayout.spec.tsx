import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { PRIVACY_PATH, TERMS_PATH } from '../../config/legal';

// Quem chega direto em /login ou /register/brand nunca passa pela landing, que
// é onde os links dos documentos moravam. Sem este rodapé, os dois documentos
// só eram alcançáveis pelo texto das caixas de aceite, que aparecem no último
// passo do cadastro.
describe('AuthLayout', () => {
  function renderLayout() {
    return render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<p>conteúdo da tela</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
  }

  it('renderiza a tela filha', () => {
    renderLayout();

    expect(screen.getByText('conteúdo da tela')).toBeInTheDocument();
  });

  it('linka os dois documentos legais em toda tela de autenticação', () => {
    renderLayout();

    const rodape = screen.getByRole('navigation', {
      name: /documentos legais/i,
    });
    expect(screen.getByRole('link', { name: 'Termos de Uso' })).toHaveAttribute('href', TERMS_PATH);
    expect(screen.getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute(
      'href',
      PRIVACY_PATH,
    );
    expect(rodape).toBeInTheDocument();
  });
});
