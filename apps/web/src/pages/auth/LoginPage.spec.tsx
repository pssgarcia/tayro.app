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
  it('oferece um caminho pra ver programas abertos', () => {
    renderPage();

    const link = screen.getByRole('link', { name: /ver programas abertos/i });
    expect(link).toHaveAttribute('href', '/programs');
  });
});
