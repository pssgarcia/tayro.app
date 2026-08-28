import { Link } from 'react-router-dom';
import { cn } from '../../../lib/utils';

// ─── Barra de ação da placa Kinetic ──────────────────────────────────────────
// Blocos retos lado a lado, colados na base de uma `KineticPlate flush`,
// separados por 1px. Substitui o `PlateActionBar` do 2a (split bar com
// secundário de largura fixa + primário quase-preto em Space Grotesk): aqui
// todo botão é mono caixa alta e o primário é lime, exatamente como o
// Aprovar/Descartar que a Fila já usa em produção.
//
// Só existe sobre a placa CLARA — as cores de texto assumem fundo claro.

export interface KineticAction {
  label: string;
  onClick?: () => void;
  /** Navegação em vez de ação — renderiza <Link> com o visual idêntico. */
  to?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
  /** Exatamente uma ação da barra deve ser a primária (bloco lime). */
  primary?: boolean;
  /** Largura fixa em px. Sem isso o bloco divide o espaço com os irmãos. */
  width?: number;
}

interface Props {
  actions: KineticAction[];
  className?: string;
}

const base =
  'flex min-h-[60px] items-center justify-center gap-2 font-mono text-xs font-medium uppercase tracking-widest transition-colors disabled:cursor-not-allowed disabled:opacity-50';

const primaryLook = 'bg-lime text-black hover:bg-white';
const ghostLook = 'bg-transparent text-[#4a4a44] hover:bg-black/5';

export default function KineticActions({ actions, className }: Props) {
  return (
    <div className={cn('flex border-t border-[#c9c9c3]', className)}>
      {actions.map((action, i) => {
        const look = cn(
          base,
          action.primary ? primaryLook : ghostLook,
          i > 0 && 'border-l border-[#c9c9c3]',
          action.width ? 'shrink-0' : 'flex-1',
        );
        const style = action.width ? { width: action.width } : undefined;

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
