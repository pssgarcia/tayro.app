import { forwardRef, useId } from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../../lib/utils';

// Caixa de marcar do sistema Kinetic: quadrada (nunca arredondada), marca em
// lime sobre o escuro e em preto sobre a placa clara. Duas variantes, mesmas
// que o KineticField (`dark` sobre o fundo, `plate` sobre o claro).
//
// É um <input type="checkbox"> de verdade, não um role="switch" como o
// KineticToggle: aqui o gesto é "concordo com este texto", que é exatamente o
// que uma caixa de marcar significa, e é o controle que leitor de tela e
// autofill reconhecem. O input fica visualmente escondido (`sr-only`) mas
// presente na árvore de acessibilidade, com a caixa desenhada ao lado dele.
//
// ─── Por que o <label> NÃO envolve o texto ──────────────────────────────────
// MORDEU na conferência visual de 2026-09-04. A 1ª versão tinha o <label>
// envolvendo a caixa E a frase; como a frase de aceite carrega os links dos
// documentos, clicar em "Termos de Uso" para LER o documento também marcava a
// caixa de aceite (o clique num link dentro de um label ativa o controle do
// label). Numa caixa de consentimento isso é grave: registra aceite de quem
// só quis abrir o documento.
//
// Estrutura atual: o <label> cobre apenas a caixa desenhada, e a frase é um
// <span> ligado ao input por `aria-labelledby`. Assim o nome acessível
// continua sendo a frase inteira (leitor de tela e `getByRole('checkbox',
// { name })` seguem funcionando), os links funcionam como links, e só a caixa
// alterna o estado.

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'children'> {
  variant?: 'dark' | 'plate';
  /** Mensagem de erro, abaixo da linha. */
  error?: string;
  children: React.ReactNode;
}

const KineticCheckbox = forwardRef<HTMLInputElement, Props>(function KineticCheckbox(
  { variant = 'dark', error, children, id, className, ...props },
  ref,
) {
  const isPlate = variant === 'plate';
  const generatedId = useId();
  const inputId = id ?? (typeof props.name === 'string' ? props.name : generatedId);
  const labelId = `${inputId}-label`;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className={className}>
      <div className="flex items-start gap-3">
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          className="peer sr-only"
          aria-labelledby={labelId}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          {...props}
        />
        {/* Só a caixa é clicável para alternar. */}
        <label
          htmlFor={inputId}
          aria-hidden
          className={cn(
            'mt-px flex h-[18px] w-[18px] shrink-0 cursor-pointer items-center justify-center border transition-colors duration-[140ms]',
            // `peer-checked:` só alcança IRMÃOS do input. O ícone é
            // descendente desta caixa, então a regra dele mora aqui, com
            // seletor de filho, e não no próprio <svg>.
            '[&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100',
            isPlate
              ? 'border-[#b8b8b1] peer-checked:border-black peer-checked:bg-black'
              : 'border-kinetic-border peer-checked:border-lime peer-checked:bg-lime',
            error && 'border-destructive',
            // Foco visível pelo teclado: o input é sr-only, então o anel
            // precisa aparecer na caixa desenhada.
            isPlate
              ? 'peer-focus-visible:ring-2 peer-focus-visible:ring-black peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-kinetic-light'
              : 'peer-focus-visible:ring-2 peer-focus-visible:ring-lime peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-kinetic-black',
          )}
        >
          <Check
            size={13}
            strokeWidth={3}
            className={cn('transition-opacity', isPlate ? 'text-kinetic-light' : 'text-black')}
          />
        </label>
        <span
          id={labelId}
          className={cn(
            'text-[12px] leading-[1.5]',
            isPlate ? 'text-[#3a3a36]' : 'text-kinetic-muted',
          )}
        >
          {children}
        </span>
      </div>
      {error && (
        <p id={errorId} className="ml-[30px] mt-1.5 text-[12px] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
});

export default KineticCheckbox;
