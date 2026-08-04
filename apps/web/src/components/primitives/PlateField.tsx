import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

// Campo "sem caixa" transversal (README: Login, os 3 cadastros, Ativar
// conta, PublishModal, modal de Entregas) — label + linha de base, nunca
// caixa. Duas variantes, com tamanhos distintos confirmados no mock:
// `plate` (sobre o claro — label 11px, valor 15px) e `dark` (sobre o
// fundo — label 12px, valor 14px).

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label: string;
  variant?: 'dark' | 'plate';
  error?: string;
  /** Marca o label com um "*" — dark: foreground, plate: plate-ink (nunca vermelho). */
  required?: boolean;
  /** Ex.: "@" no handle do Instagram — tom fixo, não acompanha o valor. */
  prefix?: string;
  /** Ex.: o olho de mostrar/ocultar senha. */
  suffix?: React.ReactNode;
}

const PlateField = forwardRef<HTMLInputElement, Props>(function PlateField(
  { label, variant = 'dark', error, required, prefix, suffix, className, ...props },
  ref,
) {
  const isPlate = variant === 'plate';

  return (
    <label className="block">
      <span
        className={cn(
          'mb-2 block',
          isPlate ? 'text-[11px] text-plate-muted' : 'text-[12px] text-[#75756E]',
        )}
      >
        {label}
        {required && <span className={cn('ml-0.5', isPlate ? 'text-plate-ink' : 'text-foreground')}>*</span>}
      </span>
      <span
        className={cn(
          'flex items-center gap-2.5 border-b pb-[9px] transition-colors duration-[140ms]',
          isPlate
            ? 'border-[rgba(14,14,14,.18)] focus-within:border-plate-ink'
            : 'border-[#232323] focus-within:border-lime',
          error && 'border-destructive focus-within:border-destructive',
        )}
      >
        {prefix && (
          <span
            className={cn(
              'shrink-0',
              isPlate ? 'text-[15px] text-plate-muted' : 'text-[14px] text-[#55554F]',
            )}
          >
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full bg-transparent leading-none outline-none',
            isPlate
              ? 'text-[15px] text-plate-ink caret-plate-ink placeholder:text-[#55554F]/70'
              : 'text-[14px] text-foreground caret-lime placeholder:text-[#55554F]',
            className,
          )}
          {...props}
        />
        {suffix}
      </span>
      {error && <span className="mt-1.5 block text-[11px] text-destructive">{error}</span>}
    </label>
  );
});

export default PlateField;
