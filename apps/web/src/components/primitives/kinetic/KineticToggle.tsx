import { cn } from '../../../lib/utils';

// ─── Interruptor (Kinetic) ───────────────────────────────────────────────────
// Extraído do `Toggle` local do Perfil da creator quando o consentimento de
// publicar resultado de parceria precisou do mesmo controle sobre a placa
// CLARA — a versão de lá era escrita pro fundo escuro do app e ficava
// invisível ali.
//
// `role="switch"` + `aria-checked` de propósito: é consentimento, e estado
// comunicado só por cor foi um achado de acessibilidade real neste projeto
// (o NicheSelector, 2026-08-28).

interface Props {
  checked: boolean;
  onChange: (value: boolean) => void;
  /** Obrigatório: o interruptor não tem texto próprio. */
  label: string;
  disabled?: boolean;
  /** 'plate' = sobre a placa clara; 'dark' = sobre o fundo do app. */
  tone?: 'dark' | 'plate';
  className?: string;
}

export default function KineticToggle({
  checked,
  onChange,
  label,
  disabled,
  tone = 'dark',
  className,
}: Props) {
  const onPlate = tone === 'plate';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative flex h-6 w-11 shrink-0 items-center rounded-full px-[3px] transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        checked
          ? 'justify-end bg-lime'
          : onPlate
            ? 'justify-start border border-[#b8b8b1] bg-[#d8d8d1]'
            : 'justify-start border border-kinetic-gray bg-kinetic-dark',
        className,
      )}
    >
      <span
        className={cn(
          'h-[18px] w-[18px] rounded-full',
          checked ? (onPlate ? 'bg-black' : 'bg-background') : 'bg-[#8a8a84]',
        )}
      />
    </button>
  );
}
