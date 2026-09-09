import { useSyncExternalStore } from 'react';
import { pt, type Dictionary } from './dictionaries/pt';
import { en } from './dictionaries/en';
import {
  applyDocumentLang,
  detectLocale,
  getLocale,
  persistLocale,
  readStoredLocale,
  setLocale,
  subscribeLocale,
  type Locale,
} from './locale';

// ─── API pública do i18n ─────────────────────────────────────────────────────
// Sem Provider de propósito. `useSyncExternalStore` já assina o store
// module-level, então nenhum componente precisa estar dentro de uma árvore
// especial — e, principalmente, NENHUM teste existente precisa passar a
// embrulhar o que renderiza. Contexto aqui só somaria cerimônia.
//
// `useT()` devolve o DICIONÁRIO, não uma função `t('a.b.c')`. Com isso o
// acesso é `t.hero.titulo`: erro de chave é erro de compilação, o editor
// completa, e renomear uma chave é um refactor guiado pelo compilador em vez
// de uma busca por string.

export const DICTIONARIES: Record<Locale, Dictionary> = { pt, en };

export type { Locale } from './locale';
export type { Dictionary } from './dictionaries/pt';
export { LOCALES, DEFAULT_LOCALE, getLocale } from './locale';

/**
 * O dicionário do idioma ativo, FORA do React. Para helper puro que não pode
 * virar hook (`utils/format.ts`) e para código chamado de fora de componente.
 * Dentro de componente use `useT()`, que re-renderiza quando o idioma muda.
 */
export function dict(): Dictionary {
  return DICTIONARIES[getLocale()];
}

/** Idioma ativo. Re-renderiza quem usa quando ele muda. */
export function useLocale(): Locale {
  return useSyncExternalStore(subscribeLocale, getLocale, getLocale);
}

/** O dicionário do idioma ativo. */
export function useT(): Dictionary {
  return DICTIONARIES[useLocale()];
}

/**
 * Troca o idioma: store, persistência e `lang` do <html>, nesta ordem.
 * Só deve ser chamada a partir de escolha EXPLÍCITA da pessoa — é o que
 * `readStoredLocale` depois trata como preferência firme, acima do navegador.
 */
export function changeLocale(locale: Locale): void {
  setLocale(locale);
  persistLocale(locale);
  applyDocumentLang(locale);
}

/**
 * Resolve o idioma inicial. Chamada uma vez no boot, ANTES do React montar,
 * pra que a primeira pintura já saia no idioma certo — detectar dentro de um
 * `useEffect` faria a página aparecer em português e piscar pro inglês.
 */
export function initLocale(): Locale {
  const locale = detectLocale({
    search: typeof window === 'undefined' ? '' : window.location.search,
    navigatorLanguage: typeof navigator === 'undefined' ? null : navigator.language,
    stored: readStoredLocale(),
    isTest: import.meta.env.MODE === 'test',
  });

  setLocale(locale);
  applyDocumentLang(locale);
  return locale;
}
