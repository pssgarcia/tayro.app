import { cn } from '../../lib/utils';
import CountUp from './CountUp';

// Antes: label mono uppercase 11px EM CIMA, valor 14px embaixo.
// Agora invertido: o NÚMERO vem primeiro em display 40px, o label vem
// embaixo em 12px minúsculo — o rótulo mono uppercase saiu (regra 1 do
// README, só 3 mono por tela). `highlight` marca UM stat por tela com
// borda lime + glow.
interface Props {
  label: string; // minúsculo: "em análise", "a receber"
  value: React.ReactNode;
  highlight?: boolean; // no máximo um por tela
  delay?: number; // escalonamento do contador
  className?: string;
}

export default function StatBlock({ label, value, highlight, delay = 0, className }: Props) {
  return (
    <div
      className={cn(
        'flex-1',
        highlight ? 'rounded-lg border border-lime px-[18px] py-4 shadow-lime-glow' : 'py-[17px]',
        className,
      )}
    >
      <CountUp delay={delay}>
        <span
          className={cn(
            'font-display text-d-lg tabular-nums',
            highlight ? 'text-lime' : 'text-foreground',
          )}
        >
          {value}
        </span>
      </CountUp>
      <p className={cn('mt-2.5 text-xs', highlight ? 'text-[#9DB562]' : 'text-muted-foreground')}>
        {label}
      </p>
    </div>
  );
}
