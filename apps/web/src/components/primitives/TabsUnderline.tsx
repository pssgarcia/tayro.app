import { cn } from '../../lib/utils';

// Abas de conteúdo transversais (Candidatura, Registro, Programas da marca):
// font-display 14px, ativa = font-semibold + sublinhado lime; inativa =
// font-medium + #75756E. Wrapper com padding-x 24px e único divisor da tela
// (ver README §Telas — "único divisor junto ao da barra de ação").

interface Tab<T extends string> {
  id: T;
  label: string;
}

interface Props<T extends string> {
  /** Aceita array readonly — TABS costuma ser declarado com `as const`. */
  tabs: readonly Tab<T>[];
  active: T;
  onChange: (id: T) => void;
  className?: string;
}

export default function TabsUnderline<T extends string>({
  tabs,
  active,
  onChange,
  className,
}: Props<T>) {
  return (
    <div className={cn('flex shrink-0 gap-5 overflow-x-auto border-b border-muted px-6', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'shrink-0 pb-3 font-display text-sm tracking-[-.02em] transition-colors',
            active === tab.id
              ? 'font-semibold text-foreground shadow-[inset_0_-2px_0_#C6FF33]'
              : 'font-medium text-[#75756E] hover:text-foreground',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
