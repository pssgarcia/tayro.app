import { Link } from 'react-router-dom';
import { cn } from '../../../lib/utils';

// ─── Barra de ação da placa Kinetic ──────────────────────────────────────────
// Blocos retos lado a lado, colados na base de uma `KineticPlate flush`,
// separados por 1px. Substitui o `PlateActionBar` do 2a (split bar com
// secundário de largura fixa + primário quase-preto em Space Grotesk): aqui
// todo botão é mono caixa alta e o primário é lime, exatamente como o
// Aprovar/Descartar que a Fila já usa em produção.
//
// Vive sobre a placa CLARA por padrão. `dark` troca o ghost pra fundo escuro
// (a landing usa a barra no hero, fora de placa) — o bloco primário lime é o
// mesmo nos dois.

export interface KineticAction {
  label: string;
  onClick?: () => void;
  /** Navegação interna — renderiza <Link> com o visual idêntico. */
  to?: string;
  /** Link externo (WhatsApp, etc.) — renderiza <a> em nova aba. `Link` não
   *  resolve URL absoluta, viraria caminho relativo quebrado. */
  href?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
  /** Exatamente uma ação da barra deve ser a primária (bloco lime). */
  primary?: boolean;
  /** Largura fixa em px. Sem isso o bloco divide o espaço com os irmãos. */
  width?: number;
}

interface Props {
  actions: KineticAction[];
  /** Barra sobre fundo escuro, fora da placa clara. */
  dark?: boolean;
  className?: string;
}

const base =
  'flex min-h-[60px] items-center justify-center gap-2 font-mono text-xs font-medium uppercase tracking-widest transition-colors disabled:cursor-not-allowed disabled:opacity-50';

const primaryLook = 'bg-lime text-black hover:bg-white';
const ghostLook = 'bg-transparent text-[#4a4a44] hover:bg-black/5';
const ghostLookDark = 'bg-transparent text-foreground hover:bg-white/5';

export default function KineticActions({ actions, dark, className }: Props) {
  const divider = dark ? 'border-kinetic-border' : 'border-[#c9c9c3]';

  return (
    <div className={cn('flex border-t', divider, className)}>
      {actions.map((action, i) => {
        const look = cn(
          base,
          action.primary ? primaryLook : dark ? ghostLookDark : ghostLook,
          i > 0 && ['border-l', divider],
          action.width ? 'shrink-0' : 'flex-1',
        );
        const style = action.width ? { width: action.width } : undefined;

        if (action.href) {
          return (
            <a
              key={action.label}
              href={action.href}
              target="_blank"
              rel="noopener noreferrer"
              className={look}
              style={style}
            >
              {action.label}
            </a>
          );
        }

        if (action.to) {
          return (
            <Link key={action.label} to={action.to} className={look} style={style}>
              {action.label}
            </Link>
          );
        }

        return (
          <button
            key={action.label}
            type={action.type ?? 'button'}
            onClick={action.onClick}
            disabled={action.disabled}
            className={look}
            style={style}
          >
            {action.label}
          </button>
        );
      })}
    </div>
  );
}
