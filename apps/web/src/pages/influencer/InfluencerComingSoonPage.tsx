import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/auth.store';

export default function InfluencerComingSoonPage() {
  const { clearAuth } = useAuthStore();
  const navigate = useNavigate();

  async function handleLogout() {
    await api.post('/auth/logout').catch(() => {});
    clearAuth();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border px-6 py-4">
        <span className="font-display text-xl font-bold tracking-tight">
          tay<span className="text-lime">ro</span>
        </span>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="space-y-2">
          <p className="font-display text-2xl font-bold">Área da creator</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Estamos preparando algo incrível para você. Em breve você terá acesso ao seu painel
            completo.
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="rounded-lg border border-border px-5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
        >
          Sair da conta
        </button>
      </main>
    </div>
  );
}
