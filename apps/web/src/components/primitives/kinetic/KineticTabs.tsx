import { cn } from '../../../lib/utils';

// Abas do Kinetic: mesmo mecanismo do `TabsUnderline` do 2a (âncora lime de
// 2px na base), rótulo em mono caixa alta. A caixa alta vem do CSS, não do
// texto — busca por nome de aba em teste e leitor de tela seguem lendo
// "Briefing", não "BRIEFING".
//
// `overflow-x-auto` não é enfeite: em 360px as 4 abas do detalhe de campanha
// não cabem, e mono caixa alta com tracking é mais largo que o equivalente em
// Inter. A faixa rola em vez de cortar.

interface Tab<T extends string> {
  id: T;
  label: string;
}

interface Props<T extends string> {
  tabs: readonly Tab<T>[];
  /** `NoInfer` nos dois: T sai só de `tabs` — mesmo motivo do TabsUnderline
   * (passar o setter de um `useState` alargava T pra `string`). */
  active: NoInfer<T>;
  onChange: (id: NoInfer<T>) => void;
  className?: string;
}

export default function KineticTabs<T extends string>({
  tabs,
  active,
  onChange,
  className,
}: Props<T>) {
  return (
    <div
      className={cn(
        'flex shrink-0 gap-7 overflow-x-auto border-b border-kinetic-gray px-4 sm:px-6',
        className,
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          aria-current={active === tab.id}
          className={cn(
            'shrink-0 pb-3.5 font-mono text-[11px] uppercase tracking-widest transition-colors',
            active === tab.id
              ? 'text-lime shadow-[inset_0_-2px_0_#C6FF33]'
              : 'text-kinetic-muted hover:text-foreground',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
