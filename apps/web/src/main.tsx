// Primeira linha — inicializa o Sentry antes do React montar. Inerte sem DSN.
import './instrument';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
// Fontes hospedadas por nós. Importado ANTES do index.css, que é quem usa as
// famílias. Ver assets/fonts/fonts.css: até 2026-09-04 vinham do Google por
// <link> no index.html, entregando IP do visitante a um terceiro.
import './assets/fonts/fonts.css';
import './index.css';
import App from './App.tsx';
import { initLocale } from './i18n';

// Resolve o idioma ANTES do React montar: detectar dentro de um efeito faria a
// página pintar em português e piscar pro inglês. Também é aqui que o `lang` do
// <html> passa a acompanhar a escolha (leitor de tela e tradução do browser).
initLocale();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
