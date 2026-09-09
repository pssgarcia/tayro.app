import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';
import { LEGAL_CONTACT_EMAIL } from '../../config/legal';
import { useLocale, useT } from '../../i18n';
import LanguageSwitcher from '../LanguageSwitcher';

// Invólucro dos documentos legais (Termos de Uso e Política de Privacidade).
//
// Os dois têm a mesma anatomia: cabeçalho com logo e voltar, tarja de versão e
// data, título, corpo em seções numeradas e um rodapé linkando o outro
// documento. Vive num componente só porque os dois são aceitos juntos e
// precisam se parecer: um documento com cara diferente do outro dá a impressão
// de que um deles é rascunho.

export function LegalDocumentShell({
  updatedLabel,
  title,
  intro,
  children,
  footer,
}: {
  updatedLabel: string;
  title: string;
  intro: React.ReactNode;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  const navigate = useNavigate();
  const t = useT();
  const locale = useLocale();

  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-[60px] items-center justify-between px-4 sm:px-6">
        <Link
          to="/"
          className="font-display text-[19px] font-bold tracking-[-.05em] text-foreground transition-opacity hover:opacity-80"
        >
          tay<span className="text-lime">ro</span>
        </Link>
        <div className="flex items-center gap-3">
          <LanguageSwitcher size="sm" />
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-[7px] text-[13px] text-kinetic-muted transition-colors hover:text-foreground"
          >
            <ArrowLeft size={14} />
            {t.app.acoes.voltar}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-20 pt-6 sm:px-6">
        {/* Só em inglês: o corpo do documento é português em qualquer idioma,
            então quem chega com a interface em inglês precisa saber disso ANTES
            de ler, e saber que é essa a versão que vale. Em português o aviso
            seria ruído. */}
        {locale === 'en' && (
          <p className="mb-6 border-l-2 border-lime pl-4 text-sm leading-[1.6] text-kinetic-text">
            {t.app.nav.documentoSoEmPortugues}
          </p>
        )}
        <p className="font-mono text-[10px] uppercase tracking-widest text-kinetic-muted">
          {updatedLabel}
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-[-.04em] text-foreground sm:text-4xl">
          {title}
        </h1>
        <div className="mt-4 space-y-3 text-sm leading-[1.6] text-kinetic-text">{intro}</div>

        {children}

        <nav
          aria-label={t.app.nav.documentosLegais}
          className="mt-12 border-t border-kinetic-gray pt-6"
        >
          {footer}
        </nav>
      </main>
    </div>
  );
}

export function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="mt-10">
      <h2 id={id} className="mb-3 font-display text-lg font-bold tracking-[-.03em] text-foreground">
        {title}
      </h2>
      <div className="space-y-3 text-sm leading-[1.6] text-kinetic-text">{children}</div>
    </section>
  );
}

export function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5 space-y-3">
      <h3 className="font-display text-sm font-semibold tracking-[-.02em] text-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}

export function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="ml-5 list-disc space-y-2">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

/** Bloco destacado para o que o TAYRO explicitamente NÃO faz. */
export function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-3 border-l-2 border-lime pl-4 text-sm leading-[1.6] text-kinetic-text">
      {children}
    </div>
  );
}

/**
 * Bloco de campo a preencher antes da publicação em produção.
 *
 * Visível na página de propósito: o TAYRO ainda não tem razão social nem CNPJ
 * constituídos, e esconder isso em comentário de código faria o documento
 * parecer completo quando não está. Ver specs/legal-acceptance.
 */
export function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-l-2 border-kinetic-gray pl-4 text-xs leading-[1.7] text-kinetic-muted">
      {children}
    </div>
  );
}

export function ContactLink() {
  return (
    <a
      href={`mailto:${LEGAL_CONTACT_EMAIL}`}
      className="flex w-fit items-center gap-2 text-sm font-medium text-lime transition-colors hover:text-foreground"
    >
      <Mail size={15} />
      {LEGAL_CONTACT_EMAIL}
    </a>
  );
}
