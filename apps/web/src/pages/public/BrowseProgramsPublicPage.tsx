import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import ProgramsList from '../influencer/ProgramsList';
import { useT } from '../../i18n';
import LanguageSwitcher from '../../components/LanguageSwitcher';

// ─── Página ──────────────────────────────────────────────────────────────────
// Vitrine pública (roadmap.md, AGORA #4): mesma listagem de /influencer/browse
// (ProgramsList, compartilhado), mas sem InfluencerGuard — visitante sem conta
// decide se vale a pena ANTES de se cadastrar. Card leva pro /apply/:id (já
// existente, cria conta ao candidatar) se anônima, ou pro detalhe autenticado
// se já houver sessão de creator — nesse caso o fluxo respeita candidatura já
// existente.

export default function BrowseProgramsPublicPage() {
  const t = useT();
  const { accessToken, user } = useAuthStore();

  const isLoggedInfluencer = !!accessToken && user?.role === 'INFLUENCER';
  const hrefBuilder = (id: string) =>
    isLoggedInfluencer ? `/influencer/programs/${id}` : `/apply/${id}`;

  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-[60px] items-center justify-between px-4 sm:px-6">
        <Link
          to="/login"
          className="font-display text-[19px] font-bold tracking-[-.05em] text-foreground hover:opacity-80 transition-opacity"
        >
          tay<span className="text-lime">ro</span>
        </Link>
        <LanguageSwitcher />
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-12 pt-6 sm:px-6 lg:pt-10">
        <ProgramsList title={t.app.publico.vitrine.titulo} hrefBuilder={hrefBuilder} />
      </main>
    </div>
  );
}
