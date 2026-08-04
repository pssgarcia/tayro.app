import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Activity, Crosshair, ScrollText, Clapperboard, IdCard, LogOut } from 'lucide-react';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/auth.store';
import { cn } from '../../lib/utils';

// Rótulos e ícones do redesign 2a (README §Telas 1, 5, 6, 7, 8).
const navItems = [
  { to: '/influencer/dashboard',    icon: Activity,      label: 'Leitura' },
  { to: '/influencer/browse',       icon: Crosshair,     label: 'Abertos' },
  { to: '/influencer/applications', icon: ScrollText,    label: 'Registro' },
  { to: '/influencer/submissions',  icon: Clapperboard,  label: 'Entregas' },
  { to: '/influencer/profile',      icon: IdCard,        label: 'Ficha' },
];

export default function InfluencerLayout() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  async function handleLogout() {
    await api.post('/auth/logout').catch(() => {});
    clearAuth();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar — desktop only */}
      <aside className="hidden md:flex w-56 flex-col border-r border-border bg-card">
        {/* Logo */}
        <div className="flex h-16 items-center px-5">
          <Link to="/influencer" className="font-display text-xl font-bold tracking-tight hover:opacity-80 transition-opacity">
            tay<span className="text-lime">ro</span>
          </Link>
        </div>

        {/* Nav — item ativo: barra vertical lime de 2px na esquerda, sem caixa (2a) */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'text-lime shadow-[inset_2px_0_0_#C6FF33]'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Usuário + logout */}
        <div className="border-t border-border p-3">
          <div className="mb-2 truncate px-2 text-xs text-muted-foreground">
            {user?.email}
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </aside>

      {/* Coluna direita: header mobile + conteúdo */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header mobile — 60px, sem borda (2a). O código mono do canto
            direito (ver README §Telas) fica pra depois — por ora o slot
            segue ocupado pelo logout, que precisa continuar acessível. */}
        <header className="flex h-[60px] shrink-0 items-center justify-between px-6 md:hidden">
          <Link
            to="/influencer"
            className="font-display text-[19px] font-bold tracking-[-.05em] hover:opacity-80 transition-opacity"
          >
            tay<span className="text-lime">ro</span>
          </Link>
          <button
            onClick={handleLogout}
            aria-label="Sair"
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <LogOut size={18} />
          </button>
        </header>

        {/* Conteúdo principal — recua pb-14 no mobile p/ não ficar atrás do bottom nav */}
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
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex min-h-[60px] flex-1 flex-col items-center justify-center gap-1.5',
                'font-display text-[11px] font-medium tracking-[-.01em] transition-colors',
                isActive ? 'text-lime shadow-[inset_0_2px_0_#C6FF33]' : 'text-muted-foreground',
              )
            }
          >
            <Icon size={19} strokeWidth={1.75} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
