import { cn } from '../../lib/utils';

// Barra de ação transversal, colada na base de uma placa `flush`: secundário
// de largura fixa + primário flex-1 que inverte pra lime no hover. Mesmo
// padrão em Candidatura (Descartar/Aprovar), Login/Cadastro (Esqueci/Entrar),
// Ativar conta, PublishModal e o modal de Entregas.

interface SecondaryProps {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  /** Largura fixa (README varia por tela: 100px na Candidatura, 106px no Login). */
  width?: number;
}

interface PrimaryProps {
  label: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  icon?: React.ReactNode;
}

interface Props {
  secondary: SecondaryProps;
  primary: PrimaryProps;
}

export default function PlateActionBar({ secondary, primary }: Props) {
  return (
    <div className="flex border-t border-plate-line">
      <button
        type="button"
        onClick={secondary.onClick}
        disabled={secondary.disabled}
        style={{ width: secondary.width ?? 100 }}
        className={cn(
          'min-h-[56px] shrink-0 font-display text-[14px] font-medium tracking-[-.02em] text-plate-muted transition-colors duration-[140ms]',
          'hover:bg-plate-ink hover:text-plate',
          'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-plate-muted',
        )}
      >
        {secondary.label}
      </button>
      <button
        type={primary.type ?? 'button'}
        onClick={primary.onClick}
        disabled={primary.disabled}
        className={cn(
          'flex min-h-[56px] flex-1 items-center justify-center gap-[9px] bg-plate-ink font-display text-[15px] font-semibold tracking-[-.025em] text-foreground transition-colors duration-[140ms]',
          'hover:bg-lime hover:text-plate-ink',
          'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-plate-ink disabled:hover:text-foreground',
        )}
      >
        {primary.label}
        {primary.icon}
      </button>
    </div>
  );
}
