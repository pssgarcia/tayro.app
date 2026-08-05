import { cn } from '../../lib/utils';

interface Props {
  children: React.ReactNode;
  /** ms de atraso. 0 no primeiro número da tela. */
  delay?: number;
  className?: string;
}

export default function CountUp({ children, delay = 0, className }: Props) {
  return (
    // `overflow-hidden` existe só pra mascarar o translateY da entrada — mas
    // corta na horizontal também. Os tamanhos display têm letter-spacing
    // negativo (d-xl: -.07em ≈ -3,2px), que o CSS aplica DEPOIS do último
    // caractere: a caixa fica mais estreita que a tinta e o último glifo (o
    // "%"/"M") aparecia cortado. pr-2 dá folga pro clipe; -mr-2 devolve o
    // espaço pro layout, então nada se desloca.
    <span className={cn('block overflow-hidden pr-2 -mr-2', className)}>
      <span
        className="inline-block animate-tayro-count motion-reduce:animate-none"
        style={delay ? { animationDelay: `${delay}ms` } : undefined}
      >
        {children}
      </span>
    </span>
  );
}
