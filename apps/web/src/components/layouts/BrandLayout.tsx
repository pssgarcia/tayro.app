import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Activity, Crosshair, Flag, LogOut, Users } from 'lucide-react';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/auth.store';
import { cn } from '../../lib/utils';
import { useT } from '../../i18n';
import LanguageSwitcher from '../LanguageSwitcher';

// Rótulos e ícones do redesign 2a (README §Telas 2, 13, 14, 16), +"Creators"
// (specs/creator-roster, 2026-09-02) — visão agregada de aprovadas, cross-campanha.
// Só rota e ícone: o rótulo vem do dicionário no render, senão ficaria
// congelado no idioma do boot.
const navItems = [
  { to: '/brand/dashboard', icon: Activity, chave: 'dashboard' },
  { to: '/brand/creators', icon: Users, chave: 'creators' },
  { to: '/brand/campaigns', icon: Crosshair, chave: 'campanhas' },
  { to: '/brand/profile', icon: Flag, chave: 'perfil' },
] as const;

export default function BrandLayout() {
  const t = useT();
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  async function handleLogout() {
    await api.post('/auth/logout').catch(() => {});
    clearAuth();
    navigate('/login', { replace: true });
  }

  return (
    // h-screen (não min-h-screen): com só um piso mínimo, o container crescia
    // pelo conteúdo e a página inteira rolava — o `overflow-auto` do <main>
    // nunca tinha uma altura de verdade pra limitar contra, então nunca
    // agia. Com altura travada em 100vh, o <main> passa a rolar por dentro
    // de verdade (é o que a Fila precisa pra manter aprovar/descartar
    // visível sem rolar a página — achado 2026-08-17). Sidebar e nav mobile
    // ganham de brinde: antes rolavam junto com o conteúdo comprido, agora
    // ficam fixos, que é o comportamento certo de app shell.
    <div className="flex h-screen bg-background">
      {/* Sidebar — desktop only */}
      <aside className="hidden md:flex w-56 flex-col border-r border-kinetic-gray bg-kinetic-black">
        {/* Logo */}
        <div className="flex h-16 items-center px-5">
          <Link
            to="/brand"
            className="font-display text-xl font-bold tracking-tight hover:opacity-80 transition-opacity"
          >
            tay<span className="text-lime">ro</span>
          </Link>
        </div>

        {/* Nav — item ativo: barra vertical lime de 2px na esquerda, sem caixa.
            Rótulo em mono caixa alta: é metadado de navegação, mesma classe
            dos rótulos de seção do Kinetic. */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map(({ to, icon: Icon, chave }) => (
            
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 font-mono text-[11px] uppercase tracking-[.16em] transition-colors',
                  isActive
                    ? 'text-lime shadow-[inset_2px_0_0_#C6FF33]'
                    : 'text-kinetic-muted hover:bg-kinetic-dark hover:text-foreground',
                )
              }
            >
              <Icon size={16} />
              {t.app.nav.marca[chave]}
            </NavLink>
          ))}
        </nav>

        {/* Usuário + logout */}
        <div className="border-t border-kinetic-gray p-3">
          {/* Acima do e-mail: é controle da interface, não identidade da
              conta. Sem ele o produto seria bilíngue sem jeito de trocar por
              dentro, já que o seletor só existe na landing. */}
          <LanguageSwitcher size="sm" className="mb-3 ml-3 w-fit" />
          <div className="mb-2.5 truncate px-3 text-[11px] text-kinetic-muted">{user?.email}</div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2.5 font-mono text-[11px] uppercase tracking-[.16em] text-kinetic-muted transition-colors hover:bg-kinetic-dark hover:text-foreground"
          >
            <LogOut size={16} />
            {t.app.nav.sair}
          </button>
        </div>
      </aside>

      {/* Coluna direita: header mobile + conteúdo */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header mobile — logo + logout */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-kinetic-gray px-4 md:hidden">
          <Link
            to="/brand"
            className="font-display text-xl font-bold tracking-tight hover:opacity-80 transition-opacity"
          >
            tay<span className="text-lime">ro</span>
          </Link>
          <button
            onClick={handleLogout}
            aria-label={t.app.nav.sair}
            className="flex h-9 w-9 items-center justify-center text-kinetic-muted transition-colors hover:bg-kinetic-dark hover:text-foreground"
          >
            <LogOut size={18} />
          </button>
        </header>

        {/* Conteúdo principal */}
        <main className="flex-1 overflow-auto pb-14 md:pb-0">
          <Outlet />
        </main>
      </div>

      {/* Bottom tab bar — mobile only. Indicador lime volta como barra de 2px
          no topo do item ativo; sem border-t (o fundo já é o mesmo do
          conteúdo, a borda era ruído). */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex bg-background pb-1 md:hidden"
        style={{ paddingBottom: 'calc(0.25rem + env(safe-area-inset-bottom))' }}
      >
        {navItems.map(({ to, icon: Icon, chave }) => (
            
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex min-h-[60px] flex-1 flex-col items-center justify-center gap-1.5',
                // tracking curto e 9px: 5 itens em mono caixa alta não cabem
                // em 360px com o tracking padrão dos rótulos.
                'font-mono text-[9px] uppercase tracking-[.08em] transition-colors',
                isActive ? 'text-lime shadow-[inset_0_2px_0_#C6FF33]' : 'text-kinetic-muted',
              )
            }
          >
            <Icon size={19} strokeWidth={1.75} />
            <span>{t.app.nav.marca[chave]}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
