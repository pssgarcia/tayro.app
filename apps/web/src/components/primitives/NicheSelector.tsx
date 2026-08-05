import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';

// Nichos padrão (fitness). Valores canônicos em minúsculas — usados também
// como filtro de campanha, então a consistência aqui evita drift.
const NICHE_OPTIONS = [
  'fitness',
  'wellness',
  'musculação',
  'crossfit',
  'yoga',
  'corrida',
  'nutrição',
  'moda fitness',
  'suplementação',
  'lifestyle',
];

interface Props {
  value: string[];
  onChange: (value: string[]) => void;
  /**
   * Nichos extras a exibir além dos padrão — ex.: nichos já salvos no perfil
   * que vieram do cadastro em texto livre e não estão na lista canônica.
   * Sem isso, um nicho fora da lista sumiria ao salvar.
   */
  extraOptions?: string[];
  /**
   * "plate" — variante do redesign 2a pros cadastros (a placa-formulário
   * vive sobre o claro): selecionado = bg-plate-ink text-plate, sem borda;
   * não selecionado = border rgba(14,14,14,.16) text-plate-muted. Tag
   * quadrada (radius 3px), sem ícone de check — só a inversão de cor avisa.
   * "dark" (default) mantém o pill rounded-full de sempre.
   */
  variant?: 'dark' | 'plate';
}

export default function NicheSelector({
  value,
  onChange,
  extraOptions = [],
  variant = 'dark',
}: Props) {
  const options = [...new Set([...NICHE_OPTIONS, ...extraOptions, ...value])];
  const isPlate = variant === 'plate';

  const toggle = (niche: string) => {
    if (value.includes(niche)) {
      onChange(value.filter((n) => n !== niche));
    } else {
      onChange([...value, niche]);
    }
  };

  return (
    <div className={cn('flex flex-wrap', isPlate ? 'gap-[7px]' : 'gap-2')}>
      {options.map((niche) => {
        const selected = value.includes(niche);

        if (isPlate) {
          return (
            <button
              key={niche}
              type="button"
              onClick={() => toggle(niche)}
              className={cn(
                'rounded-[3px] text-[11px] capitalize transition-colors',
                selected
                  ? 'bg-plate-ink px-[10px] py-[6px] text-plate'
                  : 'border border-[rgba(14,14,14,.16)] px-[10px] py-[5px] text-plate-muted',
              )}
            >
              {niche}
            </button>
          );
        }

        return (
          <button
            key={niche}
            type="button"
            onClick={() => toggle(niche)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors',
              selected
                ? 'border-lime/40 bg-lime/10 text-lime'
                : 'border-border bg-secondary text-muted-foreground hover:text-foreground',
            )}
          >
            {selected && <Check size={10} className="mr-1 inline" />}
            {niche}
          </button>
        );
      })}
    </div>
  );
}
