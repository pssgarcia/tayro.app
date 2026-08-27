/// <reference types="vite/client" />

// Primeiras variáveis VITE_* do projeto. Todas opcionais: sem DSN o Sentry
// fica inerte (dev, CI). Definidas no env do projeto Vercel para produção.
interface ImportMetaEnv {
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_SENTRY_ENVIRONMENT?: string;
  readonly VITE_SENTRY_RELEASE?: string;
  readonly VITE_SENTRY_TRACES_SAMPLE_RATE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
