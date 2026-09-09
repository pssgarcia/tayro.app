import { Link, Outlet } from 'react-router-dom';
import { PRIVACY_PATH, TERMS_PATH } from '../../config/legal';
import { useT } from '../../i18n';
import LanguageSwitcher from '../LanguageSwitcher';

// Rodapé legal em TODA tela de autenticação (login, os dois cadastros, ativar
// conta, esqueci/redefinir senha). A landing já tinha os links no rodapé dela,
// mas quem chega direto em /register/brand ou /login nunca passa pela landing:
// sem isto, os documentos só eram alcançáveis por dentro do texto das caixas
// de aceite, que aparecem no último passo do cadastro.
export default function AuthLayout() {
  const t = useT();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-10">
      <div className="w-full max-w-sm">
        <Outlet />

        <div className="mt-10 flex justify-center">
          <LanguageSwitcher />
        </div>

        <nav
          aria-label={t.app.nav.documentosLegais}
          className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 font-mono text-[10px] uppercase tracking-widest text-kinetic-muted"
        >
          <Link to={TERMS_PATH} className="transition-colors hover:text-lime">
            {t.app.nav.termos}
          </Link>
          <Link to={PRIVACY_PATH} className="transition-colors hover:text-lime">
            {t.app.nav.privacidade}
          </Link>
        </nav>
      </div>
    </div>
  );
}
