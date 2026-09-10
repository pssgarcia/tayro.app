import { Link } from 'react-router-dom';
import type { UseFormRegisterReturn } from 'react-hook-form';
import KineticCheckbox from '../primitives/kinetic/KineticCheckbox';
import { PRIVACY_PATH, TERMS_PATH } from '../../config/legal';
import { cn } from '../../lib/utils';
import { useT } from '../../i18n';

// ─── Aceite dos documentos + declaração de maioridade ────────────────────────
//
// As duas caixas obrigatórias dos três fluxos de criação de conta: cadastro de
// creator, cadastro de marca e candidatura pública. Vive num componente só
// porque a redação é a prova do aceite — três cópias divergiriam, e a versão
// que ficasse desatualizada seria justamente a que alguém marcou.
//
// Nenhuma das duas nasce marcada (não há `defaultChecked`): aceite tem que ser
// um gesto, e o zod nas três telas exige `true` para deixar enviar.
//
// Os links abrem em ABA NOVA: quem está no meio de um cadastro de 3 passos
// perde tudo que digitou se navegar para fora, e ninguém aceita um documento
// que não pode abrir.

interface Props {
  variant?: 'dark' | 'plate';
  termsField: UseFormRegisterReturn;
  adultField: UseFormRegisterReturn;
  termsError?: string;
  adultError?: string;
  /**
   * Texto extra ANTES das caixas. Usado pela candidatura pública, onde é
   * preciso dizer que enviar o formulário cria uma conta.
   */
  intro?: React.ReactNode;
  className?: string;
}

export default function LegalAcceptanceFields({
  variant = 'dark',
  termsField,
  adultField,
  termsError,
  adultError,
  intro,
  className,
}: Props) {
  const t = useT();
  const isPlate = variant === 'plate';
  const linkClass = cn(
    'underline underline-offset-2 transition-colors',
    isPlate ? 'text-black hover:text-[#6a6a64]' : 'text-lime hover:text-foreground',
  );

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {intro && (
        <p
          className={cn(
            'text-[12px] leading-[1.5]',
            isPlate ? 'text-[#3a3a36]' : 'text-kinetic-muted',
          )}
        >
          {intro}
        </p>
      )}

      <KineticCheckbox variant={variant} error={termsError} {...termsField}>
        {t.app.aceite.liEConcordo}{' '}
        <Link to={TERMS_PATH} target="_blank" rel="noopener noreferrer" className={linkClass}>
          {t.app.nav.termos}
        </Link>{' '}
        {t.app.aceite.eComA}{' '}
        <Link to={PRIVACY_PATH} target="_blank" rel="noopener noreferrer" className={linkClass}>
          {t.app.nav.privacidade}
        </Link>
        .
      </KineticCheckbox>

      <KineticCheckbox variant={variant} error={adultError} {...adultField}>
        {t.app.aceite.maioridade}
      </KineticCheckbox>
    </div>
  );
}
