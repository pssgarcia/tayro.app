import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

// Campo "sem caixa" transversal (README: Login, os 3 cadastros, Ativar
// conta, PublishModal, modal de Entregas) — label + linha de base, nunca
// caixa. Duas variantes: `plate` (sobre o claro) e `dark` (sobre o fundo).

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label: string;
  variant?: 'dark' | 'plate';
  error?: string;
  /** Ex.: "@" no handle do Instagram. */
  prefix?: string;
  /** Ex.: o olho de mostrar/ocultar senha. */
  suffix?: React.ReactNode;
}

const PlateField = forwardRef<HTMLInputElement, Props>(function PlateField(
  { label, variant = 'dark', error, prefix, suffix, className, ...props },
  ref,
) {
  const isPlate = variant === 'plate';

  return (
    <label className="block">
      <span className={cn('mb-2 block text-xs', isPlate ? 'text-plate-muted' : 'text-[#75756E]')}>
        {label}
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
          <span className={cn('shrink-0 text-[15px]', isPlate ? 'text-plate-muted' : 'text-[#8A8A84]')}>
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full bg-transparent text-[15px] leading-none outline-none',
            isPlate
              ? 'text-plate-ink caret-plate-ink placeholder:text-[#55554F]/70'
              : 'text-foreground caret-lime placeholder:text-[#55554F]',
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
