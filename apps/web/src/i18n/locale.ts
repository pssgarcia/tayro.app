// ─── Idioma ativo: detecção, persistência e store ────────────────────────────
// Núcleo do i18n do TAYRO. Sem lib: o produto precisa de dicionário tipado e
// troca de idioma, não de pluralização ICU nem de carregamento remoto — e uma
// dependência nova custaria bundle e um imposto de configuração permanente.
//
// O store é module-level (não só contexto do React) de propósito: código que
// não é componente — helper de formatação, por exemplo — precisa saber o
// idioma sem virar hook. É o mesmo desenho que o i18next usa.
//
// `pt` é o padrão E o fallback. Nada do que já existe muda de comportamento
// enquanto ninguém trocar de idioma.

export const LOCALES = ['pt', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'pt';

/** Chave do localStorage. Só guarda ESCOLHA EXPLÍCITA da pessoa. */
export const LOCALE_STORAGE_KEY = 'tayro.locale';

/** Parâmetro de URL que força o idioma (`/?lang=en`) — o que se manda por link. */
export const LOCALE_QUERY_PARAM = 'lang';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/**
 * Converte uma tag BCP-47 do navegador (`pt-BR`, `en-US`, `pt`) no nosso
 * idioma. Qualquer variante de português cai em `pt`; o resto do mundo cai em
 * `en`, que é justamente o ponto de ter a landing em inglês.
 */
export function localeFromLanguageTag(tag: string | undefined | null): Locale | null {
  if (!tag) return null;
  const base = tag.toLowerCase().split('-')[0];
  if (base === 'pt') return 'pt';
  if (base === 'en') return 'en';
  // Idioma que não é nenhum dos dois: inglês serve melhor que português a
  // quem fala espanhol ou francês. Não é chute de tradução, é fallback.
  return base ? 'en' : null;
}

interface DetectOptions {
  /** `window.location.search`. */
  search?: string;
  /** `navigator.language`. */
  navigatorLanguage?: string | null;
  /** Valor já persistido (escolha explícita anterior). */
  stored?: string | null;
  /**
   * Em teste o padrão é sempre `pt`, independentemente do navegador. O jsdom
   * se declara `en-US`, então sem esta guarda TODA a suíte existente passaria
   * a rodar em inglês por acidente e as asserções em português quebrariam por
   * um motivo que nada tem a ver com o que elas checam. Mesmo padrão do
   * `useStepGuard`, que zera o delay em `MODE=test`.
   */
  isTest?: boolean;
}

/**
 * Ordem de precedência, da mais forte pra mais fraca:
 *   1. `?lang=` na URL      — o link que alguém mandou
 *   2. escolha salva        — a pessoa já trocou o idioma nesta máquina
 *   3. idioma do navegador  — quem chega pela primeira vez
 *   4. `pt`                 — padrão do produto
 */
export function detectLocale({
  search,
  navigatorLanguage,
  stored,
  isTest,
}: DetectOptions = {}): Locale {
  const fromQuery = new URLSearchParams(search ?? '').get(LOCALE_QUERY_PARAM);
  if (isLocale(fromQuery)) return fromQuery;

  if (isLocale(stored)) return stored;

  if (isTest) return DEFAULT_LOCALE;

  return localeFromLanguageTag(navigatorLanguage) ?? DEFAULT_LOCALE;
}

/** Lê a escolha salva. Storage pode lançar (janela privada, cookies bloqueados). */
export function readStoredLocale(): Locale | null {
  try {
    const value = localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(value) ? value : null;
  } catch {
    return null;
  }
}

export function persistLocale(locale: Locale): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Sem persistência a troca vale só pra esta aba. Não é motivo pra quebrar.
  }
}

// ─── Store ───────────────────────────────────────────────────────────────────

let current: Locale = DEFAULT_LOCALE;
const listeners = new Set<() => void>();

export function getLocale(): Locale {
  return current;
}

export function setLocale(locale: Locale): void {
  if (current === locale) return;
  current = locale;
  listeners.forEach((l) => l());
}

export function subscribeLocale(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Só pra teste: devolve o store ao estado de origem entre casos. */
export function resetLocaleForTests(): void {
  current = DEFAULT_LOCALE;
  listeners.clear();
}

/**
 * Mantém o `lang` do <html> em dia. Não é detalhe: é o atributo que faz o
 * leitor de tela escolher a voz e a pronúncia certas, e o navegador oferecer
 * (ou não) tradução automática. `pt` vira `pt-BR`, que é o que o index.html
 * sempre teve.
 */
export function applyDocumentLang(locale: Locale): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = locale === 'pt' ? 'pt-BR' : 'en';
}
