import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserRound } from 'lucide-react';
import { cn } from '../../../lib/utils';

// ─── Entrada de conta do header ──────────────────────────────────────────────
// Um único ponto de entrada — o ícone de pessoa — em vez de "Entrar" e "Criar
// conta" disputando espaço no topo. Abre um menu com as duas saídas.
//
// As duas rotas já existem e nenhuma é inventada: `/login` e `/register`, que é
// o `RegisterChooserPage`. Mandar direto pra `/register/brand` seria escolher o
// papel pela pessoa, e o produto não tem troca de papel depois do cadastro —
// quem escolhe é ela, na tela que existe pra isso.
//
// Fecha no Escape e no clique fora. `aria-expanded`/`aria-haspopup` porque o
// ícone sozinho não diz que abre alguma coisa.

const item =
  'block px-4 py-3 font-mono text-[11px] uppercase tracking-widest text-kinetic-text transition-colors hover:bg-white/5 hover:text-lime focus-visible:bg-white/5 focus-visible:text-lime focus-visible:outline-none';

export default function HeaderAccountMenu() {
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;

    function aoClicarFora(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setAberto(false);
    }
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'Escape') setAberto(false);
    }

    document.addEventListener('mousedown', aoClicarFora);
    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('mousedown', aoClicarFora);
      document.removeEventListener('keydown', aoTeclar);
    };
  }, [aberto]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-label="Conta"
        className={cn(
          'flex h-10 w-10 items-center justify-center border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          aberto
            ? 'border-lime text-lime'
            : 'border-kinetic-border text-kinetic-text hover:border-lime hover:text-lime',
        )}
      >
        <UserRound size={17} />
      </button>

      {aberto && (
        <div
          role="menu"
          aria-label="Conta"
          className="absolute right-0 top-full z-50 mt-2 w-[188px] border border-kinetic-border bg-kinetic-dark"
        >
          <Link role="menuitem" to="/login" className={item} onClick={() => setAberto(false)}>
            Entrar
          </Link>
          <Link
            role="menuitem"
            to="/register"
            className={cn(item, 'border-t border-kinetic-gray')}
            onClick={() => setAberto(false)}
          >
            Criar conta
          </Link>
        </div>
      )}
    </div>
  );
}
