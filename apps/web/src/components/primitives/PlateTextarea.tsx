import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

// Mesmo padrão do PlateField (label + linha de base, sem caixa), pra texto
// longo. pb-[34px] em vez de pb-[9px] é o que dá altura ao campo sem
// desenhar uma caixa de textarea. Duas variantes, mesmos tamanhos do
// PlateField: `plate` (sobre o claro — label 11px, valor 15px) e `dark`
// (sobre o fundo — label 12px, valor 14px).

interface Props extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  variant?: 'dark' | 'plate';
  error?: string;
}

const PlateTextarea = forwardRef<HTMLTextAreaElement, Props>(function PlateTextarea(
  { label, variant = 'dark', error, className, ...props },
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
      </span>
      <span
        className={cn(
          'block border-b pb-[34px] transition-colors duration-[140ms]',
          isPlate
            ? 'border-[rgba(14,14,14,.18)] focus-within:border-plate-ink'
            : 'border-[#232323] focus-within:border-lime',
          error && 'border-destructive focus-within:border-destructive',
        )}
      >
        <textarea
          ref={ref}
          rows={1}
          className={cn(
            'w-full resize-none bg-transparent leading-none outline-none',
            isPlate
              ? 'text-[15px] text-plate-ink caret-plate-ink placeholder:text-[#55554F]/70'
              : 'text-[14px] text-foreground caret-lime placeholder:text-[#55554F]',
            className,
          )}
          {...props}
        />
      </span>
      {error && <span className="mt-1.5 block text-[11px] text-destructive">{error}</span>}
    </label>
  );
});

export default PlateTextarea;
