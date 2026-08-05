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
   * "plate" — sobre o claro (a placa-formulário dos cadastros): selecionado
   * = bg-plate-ink text-plate, sem borda; não selecionado = border
   * rgba(14,14,14,.16) text-plate-muted.
   * "dark" (default) — sobre o fundo (Novo programa, Ficha, Perfil da
   * marca): selecionado = bg-plate text-[#0A0A0A] (a placa "vaza" pro
   * fundo escuro); não selecionado = border #232323 text-[#8A8A85].
   * As duas são tag quadrada (radius 3px), sem ícone de check — só a
   * inversão de cor avisa que está selecionado.
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
    <div className="flex flex-wrap gap-[7px]">
      {options.map((niche) => {
        const selected = value.includes(niche);

        return (
          <button
            key={niche}
            type="button"
            onClick={() => toggle(niche)}
            className={cn(
              'rounded-[3px] text-[11px] capitalize transition-colors',
              isPlate
                ? selected
                  ? 'bg-plate-ink px-[10px] py-[6px] text-plate'
                  : 'border border-[rgba(14,14,14,.16)] px-[10px] py-[5px] text-plate-muted'
                : selected
                  ? 'bg-plate px-[10px] py-[6px] text-[#0A0A0A]'
                  : 'border border-[#232323] px-[10px] py-[5px] text-[#8A8A85]',
            )}
          >
            {niche}
          </button>
        );
      })}
    </div>
  );
}
