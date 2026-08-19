import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Activity, Crosshair, Flag, LogOut } from 'lucide-react';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/auth.store';
import { cn } from '../../lib/utils';

// Rótulos e ícones do redesign 2a (README §Telas 2, 13, 14, 16): 3 itens.
const navItems = [
  { to: '/brand/dashboard', icon: Activity,   label: 'Leitura' },
  { to: '/brand/campaigns', icon: Crosshair,  label: 'Programas' },
  { to: '/brand/profile',   icon: Flag,       label: 'Marca' },
];

export default function BrandLayout() {
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
      <aside className="hidden md:flex w-56 flex-col border-r border-border bg-card">
        {/* Logo */}
        <div className="flex h-16 items-center px-5">
          <Link to="/brand" className="font-display text-xl font-bold tracking-tight hover:opacity-80 transition-opacity">
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
          <div className="mb-2 truncate px-2 text-xs text-muted-foreground">{user?.email}</div>
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
        {/* Header mobile — logo + logout */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4 md:hidden">
          <Link to="/brand" className="font-display text-xl font-bold tracking-tight hover:opacity-80 transition-opacity">
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
