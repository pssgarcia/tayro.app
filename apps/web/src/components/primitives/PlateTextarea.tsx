import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

// Mesmo padrão do PlateField (label + linha de base, sem caixa), pra texto
// longo — só existe na variante dark hoje (Apply público). pb-[34px] em vez
// de pb-[9px] é o que dá altura ao campo sem desenhar uma caixa de textarea.

interface Props extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

const PlateTextarea = forwardRef<HTMLTextAreaElement, Props>(function PlateTextarea(
  { label, error, className, ...props },
  ref,
) {
  return (
    <label className="block">
      <span className="mb-2 block text-[12px] text-[#75756E]">{label}</span>
      <span
        className={cn(
          'block border-b pb-[34px] transition-colors duration-[140ms]',
          'border-[#232323] focus-within:border-lime',
          error && 'border-destructive focus-within:border-destructive',
        )}
      >
        <textarea
          ref={ref}
          rows={1}
          className={cn(
            'w-full resize-none bg-transparent text-[14px] leading-none text-foreground outline-none',
            'caret-lime placeholder:text-[#55554F]',
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
