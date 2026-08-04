import { cn } from '../../lib/utils';

interface Props {
  children: React.ReactNode;
  /** ms de atraso. 0 no primeiro número da tela. */
  delay?: number;
  className?: string;
}

export default function CountUp({ children, delay = 0, className }: Props) {
  return (
    <span className={cn('block overflow-hidden', className)}>
      <span
        className="inline-block animate-tayro-count motion-reduce:animate-none"
        style={delay ? { animationDelay: `${delay}ms` } : undefined}
      >
        {children}
      </span>
    </span>
  );
}
