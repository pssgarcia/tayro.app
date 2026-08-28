import { cn } from '../../../lib/utils';

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
   * = bg-black text-[#e5e5e0], sem borda; não selecionado = border
   * rgba(14,14,14,.16) text-[#6a6a64].
   * "dark" (default) — sobre o fundo (Novo programa, Ficha, Perfil da
   * marca): selecionado = bg-lime text-black (a placa "vaza" pro
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
            // Toggle que só comunicava estado por COR: quem usa leitor de tela
            // não tinha como saber quais nichos estavam marcados.
            aria-pressed={selected}
            onClick={() => toggle(niche)}
            className={cn(
              'text-[11px] capitalize transition-colors',
              isPlate
                ? selected
                  ? 'bg-black px-[10px] py-[6px] text-[#e5e5e0]'
                  : 'border border-[#b8b8b1] px-[10px] py-[5px] text-[#6a6a64]'
                : selected
                  ? 'bg-lime px-[10px] py-[6px] text-black'
                  : 'border border-kinetic-border px-[10px] py-[5px] text-kinetic-muted',
            )}
          >
            {niche}
          </button>
        );
      })}
    </div>
  );
}
