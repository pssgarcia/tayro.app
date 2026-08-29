import { cn } from '../../../lib/utils';
import type { DemoPost } from './demo';

// ─── Grade de posts recentes (demonstração) ──────────────────────────────────
// Mesma anatomia da Fila real: 6 quadrados, três por linha. Célula sem imagem
// cai num bloco neutro — que é literalmente o que o produto renderiza enquanto
// o Instagram não sincronizou, então o estado vazio não é um placeholder de
// maquete, é um estado real da tela.

interface Props {
  posts: DemoPost[];
  /** 'plate' = sobre a placa clara (p&b); 'dark' = sobre o fundo do app. */
  tone?: 'plate' | 'dark';
  /** 3 = a proporção da placa da Fila; 6 = a faixa única do `ThumbGrid`, que o
   *  produto usa onde o espaço vertical é curto. */
  cols?: 3 | 6;
  /** Acima da dobra: carrega de imediato (a faixa do herói). */
  priority?: boolean;
  className?: string;
}

export default function PostGrid({
  posts,
  tone = 'plate',
  cols = 3,
  priority,
  className,
}: Props) {
  const onPlate = tone === 'plate';
  const cells = Array.from({ length: 6 }, (_, i) => posts[i] ?? {});

  return (
    <div
      className={cn(
        'grid gap-[6px]',
        cols === 6 ? 'grid-cols-6' : 'grid-cols-3',
        className,
      )}
    >
      {cells.map((post, i) =>
        post.src ? (
          <div
            key={i}
            className={cn('aspect-square overflow-hidden', onPlate ? 'bg-[#d4d4cd]' : 'bg-kinetic-gray')}
          >
            <img
              src={post.src}
              alt=""
              loading={priority ? 'eager' : 'lazy'}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div
            key={i}
            aria-hidden="true"
            className={cn('aspect-square', onPlate ? 'bg-[#d4d4cd]' : 'bg-kinetic-gray')}
          />
        ),
      )}
    </div>
  );
}
