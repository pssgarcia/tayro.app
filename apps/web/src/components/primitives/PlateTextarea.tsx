import { forwardRef, useCallback, useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';

// Mesmo padrão do PlateField (label + linha de base, sem caixa, htmlFor/id
// em vez de label-envolve-input — error precisa ficar fora do <label> pra
// não entrar na accessible name do campo), pra texto longo. pb-[34px] em vez
// de pb-[9px] é o que dá altura ao campo sem desenhar uma caixa de textarea.
// Duas variantes, mesmos tamanhos do PlateField: `plate` (sobre o claro —
// label 11px, valor 15px) e `dark` (sobre o fundo — label 12px, valor 14px).
//
// O campo CRESCE com o conteúdo (bug reportado 2026-08-23): com `rows={1}`
// fixo e sem quebra de palavra, quem escrevia um texto mais longo perdia de
// vista o que já tinha escrito — a primeira linha rolava pra fora de um campo
// de uma linha só. Agora a altura acompanha o texto e palavra longa sem espaço
// quebra em vez de esticar o campo pro lado.
//
// A entrelinha vai colada no tamanho da fonte (`text-[14px]/[1.45]`), não como
// classe `leading-*` separada: `text-[…]` e `leading-*` são o mesmo grupo de
// conflito no tailwind-merge, e como a classe de tamanho vem depois na
// composição, ela apagava a de entrelinha. Era o caso do `leading-none` que
// estava aqui antes — nunca chegou a ser aplicado.

interface Props extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  variant?: 'dark' | 'plate';
  error?: string;
}

/** Ajusta a altura ao conteúdo. `auto` primeiro, pra encolher ao apagar. */
function autoGrow(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
}

const PlateTextarea = forwardRef<HTMLTextAreaElement, Props>(function PlateTextarea(
  { label, variant = 'dark', error, id, className, onInput, ...props },
  ref,
) {
  const isPlate = variant === 'plate';
  const textareaId = id ?? (typeof props.name === 'string' ? props.name : undefined);
  const innerRef = useRef<HTMLTextAreaElement | null>(null);

  // Ref própria + a de fora (o `register` do react-hook-form manda uma).
  const setRefs = useCallback(
    (node: HTMLTextAreaElement | null) => {
      innerRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  // Sem lista de dependências de propósito: cobre a montagem, o prefill da
  // edição e qualquer `setValue` programático. Digitar não re-renderiza um
  // campo não-controlado — esse caso é o onInput abaixo.
  useEffect(() => {
    autoGrow(innerRef.current);
  });

  return (
    <div>
      <label
        htmlFor={textareaId}
        className={cn('mb-2 block', isPlate ? 'text-[11px] text-plate-muted' : 'text-[12px] text-[#75756E]')}
      >
        {label}
      </label>
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
          id={textareaId}
          ref={setRefs}
          rows={1}
          onInput={(e) => {
            autoGrow(e.currentTarget);
            onInput?.(e);
          }}
          className={cn(
            'w-full resize-none overflow-hidden break-words bg-transparent outline-none',
            isPlate
              ? 'text-[15px]/[1.45] text-plate-ink caret-plate-ink placeholder:text-[#55554F]/70'
              : 'text-[14px]/[1.45] text-foreground caret-lime placeholder:text-[#55554F]',
            className,
          )}
          {...props}
        />
      </span>
      {error && <span className="mt-1.5 block text-[11px] text-destructive">{error}</span>}
    </div>
  );
});

export default PlateTextarea;
