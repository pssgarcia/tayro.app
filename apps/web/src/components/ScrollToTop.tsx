import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

// O roteador deste app é declarativo (<Routes>/<Route> em App.tsx), não um
// data router — o <ScrollRestoration> nativo do react-router só existe pro
// modo criado com createBrowserRouter. Sem substituto, navegar por <Link>
// preserva a posição de scroll da página anterior: quem clicava, por exemplo,
// no rodapé dos Termos de Uso pra ir pra Política de Privacidade caía no meio
// do texto do documento novo, na mesma altura em que tinha parado de ler o
// anterior (MORDEU 2026-09-09).
//
// Só reseta em navegação PUSH/REPLACE (link clicado, redirect). POP (botão
// voltar/avançar do navegador) não mexe no scroll — é o comportamento nativo
// que a pessoa espera ao voltar.
export default function ScrollToTop() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (navigationType === 'POP') return;
    window.scrollTo(0, 0);
  }, [pathname, navigationType]);

  return null;
}
