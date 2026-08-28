import { Link } from 'react-router-dom';
import { cn } from '../../../lib/utils';

// ─── Linha de lista (Kinetic) ────────────────────────────────────────────────
// Índice mono opcional + título + meta + algo à direita (quase sempre um
// `StatusWord`). A diferença que importa em relação às linhas do 2a: a linha
// é um ALVO. Selecionada, ganha fundo `kinetic-dark` e borda `kinetic-gray` —
// o mesmo estado que a lista da Fila usa pra dizer qual candidatura está
// aberta na placa. Sem `onClick`/`to` ela renderiza como <div> inerte, sem
// aparência de clicável.

interface Props {
  /** Índice 1-based; renderizado com zero à esquerda ("01"). */
  index?: number;
  title: React.ReactNode;
  meta?: React.ReactNode;
  /** Bloco à esquerda do título — avatar, por exemplo. */
  leading?: React.ReactNode;
  /** Bloco à direita — normalmente um `StatusWord`. */
  trailing?: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  to?: string;
  className?: string;
}

export default function KineticRow({
  index,
  title,
  meta,
  leading,
  trailing,
  selected,
  onClick,
  to,
  className,
}: Props) {
  const interactive = Boolean(onClick || to);

  const classes = cn(
    'flex w-full items-center gap-4 border p-3 text-left transition-colors',
    selected
      ? 'border-kinetic-gray bg-kinetic-dark'
      : cn('border-transparent bg-transparent', interactive && 'hover:bg-kinetic-dark'),
    className,
  );

  const body = (
    <>
      {index != null && (
        <span className="shrink-0 font-mono text-[11px] text-kinetic-muted">
          {String(index).padStart(2, '0')}
        </span>
      )}
      {leading}
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block truncate font-display text-base font-semibold tracking-[-.03em]',
            selected ? 'text-white' : 'text-kinetic-text',
          )}
        >
          {title}
        </span>
        {meta && <span className="mt-[5px] block truncate text-xs text-kinetic-muted">{meta}</span>}
      </span>
      {trailing}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes} aria-current={selected ? true : undefined}>
        {body}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes} aria-current={selected}>
        {body}
      </button>
    );
  }

  return <div className={classes}>{body}</div>;
}
