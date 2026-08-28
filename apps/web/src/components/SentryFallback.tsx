interface SentryFallbackProps {
  /** Reseta o boundary e re-renderiza a árvore. */
  onReset: () => void;
}

/**
 * Tela mostrada quando um erro de render sobe até o `Sentry.ErrorBoundary` no
 * topo do App. Antes disso, um erro assim dava tela branca sem rastro.
 * O evento já foi pro Sentry pelo boundary; aqui só sobra dar uma saída.
 */
export default function SentryFallback({ onReset }: SentryFallbackProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
      <h1 className="text-lg font-semibold text-foreground">Algo quebrou nesta tela.</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        O erro foi registrado. Tenta recarregar — se continuar, volta daqui a pouco.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-2 min-h-[52px] bg-lime px-6 font-mono text-[11px] font-medium uppercase tracking-widest text-black transition-colors hover:bg-white"
      >
        Recarregar
      </button>
    </div>
  );
}
