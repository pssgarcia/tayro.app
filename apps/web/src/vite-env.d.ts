/// <reference types="vite/client" />

// Variáveis VITE_* do projeto. Todas opcionais: sem elas as features degradam
// (Sentry inerte; CTA de contato cai pra /register/brand). Definidas no env do
// projeto Vercel para produção.
interface ImportMetaEnv {
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_SENTRY_ENVIRONMENT?: string;
  readonly VITE_SENTRY_RELEASE?: string;
  readonly VITE_SENTRY_TRACES_SAMPLE_RATE?: string;
  /** Número de WhatsApp do contato comercial (dígitos ou mascarado). CTA da
   *  landing. Ausente → CTA principal vai pra /register/brand. */
  readonly VITE_CONTACT_WHATSAPP?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
