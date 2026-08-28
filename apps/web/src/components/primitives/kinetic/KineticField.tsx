import { forwardRef } from 'react';
import { cn } from '../../../lib/utils';

// Campo "sem caixa" transversal (README: Login, os 3 cadastros, Ativar
// conta, PublishModal, modal de Entregas) — label + linha de base, nunca
// caixa. Duas variantes, com tamanhos distintos confirmados no mock:
// `plate` (sobre o claro — label 11px, valor 15px) e `dark` (sobre o
// fundo — label 12px, valor 14px).
//
// label/input usam htmlFor/id (não o padrão de label-envolve-input) de
// propósito: hint e error precisam ficar FORA do <label> — se entrassem,
// a accessible name do campo (o que getByLabelText calcula) juntaria o
// texto do hint/error ao label, e queries exatas como getByLabelText('Senha')
// parariam de bater assim que um hint aparecesse.

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label: string;
  variant?: 'dark' | 'plate';
  error?: string;
  /** Marca o label com um "*" — dark: foreground, plate: preto (nunca vermelho). */
  required?: boolean;
  /** Ex.: "@" no handle do Instagram — tom fixo, não acompanha o valor. */
  prefix?: string;
  /** Ex.: o olho de mostrar/ocultar senha. */
  suffix?: React.ReactNode;
  /** Ex.: "Mínimo 8 caracteres" — some com error, error tem prioridade. */
  hint?: string;
}

const KineticField = forwardRef<HTMLInputElement, Props>(function KineticField(
  { label, variant = 'dark', error, required, prefix, suffix, hint, id, className, ...props },
  ref,
) {
  const isPlate = variant === 'plate';
  const inputId = id ?? (typeof props.name === 'string' ? props.name : undefined);

  return (
    <div>
      <label
        htmlFor={inputId}
        className={cn(
          'mb-2.5 block font-mono text-[10px] uppercase tracking-widest',
          isPlate ? 'text-[#6a6a64]' : 'text-kinetic-muted',
        )}
      >
        {label}
        {required && (
          <span className={cn('ml-0.5', isPlate ? 'text-black' : 'text-foreground')}>*</span>
        )}
      </label>
      <span
        className={cn(
          'flex items-center gap-2.5 border-b pb-[9px] transition-colors duration-[140ms]',
          isPlate
            ? 'border-[#b8b8b1] focus-within:border-black'
            : 'border-kinetic-border focus-within:border-lime',
          error && 'border-destructive focus-within:border-destructive',
        )}
      >
        {prefix && (
          <span
            className={cn(
              'shrink-0',
              isPlate ? 'text-[15px] text-[#6a6a64]' : 'text-[14px] text-[#55554f]',
            )}
          >
            {prefix}
          </span>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            'w-full bg-transparent leading-none outline-none',
            isPlate
              ? 'text-[15px] text-black caret-black placeholder:text-[#55554f]/70'
              : 'text-[14px] text-foreground caret-lime placeholder:text-[#55554f]',
            className,
          )}
          {...props}
        />
        {suffix}
      </span>
      {error ? (
        <span className="mt-1.5 block text-[11px] text-destructive">{error}</span>
      ) : (
        hint && <span className="mt-1.5 block text-[11px] text-[#8A8A84]">{hint}</span>
      )}
    </div>
  );
});

export default KineticField;
