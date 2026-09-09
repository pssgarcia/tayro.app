import { cn } from '../lib/utils';
import { changeLocale, useLocale, LOCALES, DICTIONARIES } from '../i18n';

// ─── Seletor de idioma ───────────────────────────────────────────────────────
// Dois blocos retos em mono caixa alta, na gramática Kinetic — o mesmo
// vocabulário visual do resto dos controles do produto.
//
// Acessibilidade: é um grupo NOMEADO de botões com `aria-pressed`, não cor
// sozinha dizendo qual está ativo. Foi exatamente o defeito encontrado no
// `NicheSelector` em 2026-08-28 (estado comunicado só por cor, invisível pra
// leitor de tela) e não vale a pena repetir.
//
// Cada rótulo aparece NO PRÓPRIO IDIOMA ("Português", "English"), nunca
// traduzido pro idioma ativo: quem não lê a língua da página precisa
// reconhecer a sua.

export default function LanguageSwitcher({
  className,
  size = 'md',
}: {
  className?: string;
  /** `sm` pro rodapé da sidebar, onde ele acompanha o e-mail e o Sair. */
  size?: 'sm' | 'md';
}) {
  const atual = useLocale();
  // O tamanho vive nos BOTÕES, não na raiz: `className` cai no <div> e não
  // alcançaria daqui, então isto é prop e não classe de fora.
  const escala =
    size === 'sm'
      ? 'min-h-[26px] px-2 text-[10px]'
      : 'min-h-[40px] px-2.5 text-[11px] sm:px-3';

  return (
    <div
      role="group"
      aria-label={DICTIONARIES[atual].idioma.alternar}
      className={cn('flex border border-kinetic-border', className)}
    >
      {LOCALES.map((locale) => {
        const ativo = locale === atual;
        return (
          <button
            key={locale}
            type="button"
            onClick={() => changeLocale(locale)}
            aria-pressed={ativo}
            // O nome acessível é o idioma por extenso; o visível é a sigla,
            // que é o que cabe no header.
            aria-label={DICTIONARIES[locale].idioma.nome}
            className={cn(
              'font-mono font-medium uppercase tracking-widest transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              escala,
              ativo
                ? 'bg-lime text-black'
                : 'text-kinetic-muted hover:text-foreground',
            )}
          >
            {DICTIONARIES[locale].idioma.curto}
          </button>
        );
      })}
    </div>
  );
}
