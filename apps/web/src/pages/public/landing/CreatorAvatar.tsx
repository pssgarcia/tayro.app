import { cn } from '../../../lib/utils';
import { iniciais } from './demo';

// ─── Avatar da creator (demonstração) ────────────────────────────────────────
// Espelha o comportamento real do produto: quando não há foto do Instagram
// sincronizada, a Fila cai nas iniciais em vez de mostrar um quadro vazio.
// Aqui a regra é a mesma, então a demonstração continua honesta mesmo sem
// nenhuma imagem carregada.
//
// A foto entra em p&b quando está sobre a placa clara (regra 5 do design
// system) e a cores fora dela.

interface Props {
  nome: string;
  src?: string;
  /** Lado do quadrado, em px. */
  size?: number;
  /** 'plate' = sobre a placa clara; 'dark' = sobre o fundo. */
  tone?: 'plate' | 'dark';
  /** Acima da dobra: carrega de imediato. `lazy` no herói atrasa justamente a
   *  imagem que a página precisa mostrar primeiro. */
  priority?: boolean;
  className?: string;
}

export default function CreatorAvatar({
  nome,
  src,
  size = 64,
  tone = 'plate',
  priority,
  className,
}: Props) {
  const onPlate = tone === 'plate';

  return (
    <span
      style={{ width: size, height: size }}
      className={cn(
        // O avatar guarda raio de propósito: é o elemento que o sistema já
        // arredonda, mesmo onde o resto dos controles é reto.
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-md',
        onPlate ? 'bg-[#d4d4cd]' : 'bg-kinetic-gray',
        className,
      )}
    >
      {src ? (
        <img
          src={src}
          alt=""
          loading={priority ? 'eager' : 'lazy'}
          /* Os retratos são 3:4 e o avatar é quadrado: centralizar corta a
             testa e deixa o rosto pequeno. 28% puxa a janela pra cima, onde o
             rosto está. */
          className="h-full w-full object-cover object-[50%_28%]"
        />
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            'font-mono font-medium tracking-widest',
            onPlate ? 'text-[#6a6a64]' : 'text-kinetic-muted',
          )}
          style={{ fontSize: Math.max(10, Math.round(size / 4.5)) }}
        >
          {iniciais(nome)}
        </span>
      )}
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-0 rounded-md',
          onPlate ? 'ring-1 ring-inset ring-black/10' : 'ring-1 ring-inset ring-white/10',
        )}
      />
    </span>
  );
}
