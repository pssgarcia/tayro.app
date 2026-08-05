import { cn } from '../../lib/utils';

interface Props {
  children: React.ReactNode;
  /** Quais cantos recebem crop mark. 'all' = 4 (dashboard), 'top' = 2 (cards de fila). */
  marks?: 'all' | 'top' | 'none';
  /** Sem padding interno — para placas que têm barra de ação colada na base. */
  flush?: boolean;
  className?: string;
}

function Mark({ pos }: { pos: string }) {
  return (
    <>
      <span aria-hidden className={cn('absolute h-px w-[9px] bg-plate-mark', pos)} />
      <span aria-hidden className={cn('absolute h-[9px] w-px bg-plate-mark', pos)} />
    </>
  );
}

export default function Plate({ children, marks = 'all', flush, className }: Props) {
  return (
    <div
      className={cn(
        'relative rounded-lg bg-plate shadow-plate',
        flush ? 'overflow-hidden' : 'px-[26px] pb-[26px] pt-[30px]',
        className,
      )}
    >
      {marks !== 'none' && (
        <>
          <Mark pos="left-2.5 top-2.5" />
          <Mark pos="right-2.5 top-2.5" />
          {marks === 'all' && (
            <>
              <Mark pos="bottom-2.5 left-2.5" />
              <Mark pos="bottom-2.5 right-2.5" />
            </>
          )}
        </>
      )}
      {children}
    </div>
  );
}
