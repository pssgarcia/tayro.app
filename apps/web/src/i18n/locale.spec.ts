import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  applyDocumentLang,
  detectLocale,
  getLocale,
  isLocale,
  localeFromLanguageTag,
  persistLocale,
  readStoredLocale,
  setLocale,
  subscribeLocale,
  LOCALE_STORAGE_KEY,
} from './locale';

beforeEach(() => {
  localStorage.clear();
  setLocale('pt');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('isLocale', () => {
  it('aceita só os idiomas que existem', () => {
    expect(isLocale('pt')).toBe(true);
    expect(isLocale('en')).toBe(true);
    expect(isLocale('es')).toBe(false);
    expect(isLocale('')).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });
});

describe('localeFromLanguageTag', () => {
  it('qualquer variante de português cai em pt', () => {
    expect(localeFromLanguageTag('pt')).toBe('pt');
    expect(localeFromLanguageTag('pt-BR')).toBe('pt');
    expect(localeFromLanguageTag('pt-PT')).toBe('pt');
    expect(localeFromLanguageTag('PT-br')).toBe('pt');
  });

  it('inglês cai em en', () => {
    expect(localeFromLanguageTag('en-US')).toBe('en');
    expect(localeFromLanguageTag('en')).toBe('en');
  });

  // O ponto de ter inglês é atender quem não lê português. Mandar quem fala
  // espanhol pro português seria decidir por ela com base em proximidade.
  it('idioma que não é nenhum dos dois cai em inglês, não em português', () => {
    expect(localeFromLanguageTag('es-AR')).toBe('en');
    expect(localeFromLanguageTag('fr')).toBe('en');
    expect(localeFromLanguageTag('ja')).toBe('en');
  });

  it('sem tag nenhuma, não decide nada', () => {
    expect(localeFromLanguageTag(null)).toBeNull();
    expect(localeFromLanguageTag(undefined)).toBeNull();
    expect(localeFromLanguageTag('')).toBeNull();
  });
});

describe('detectLocale', () => {
  it('a URL ganha de tudo — é o link que alguém mandou', () => {
    expect(
      detectLocale({ search: '?lang=en', stored: 'pt', navigatorLanguage: 'pt-BR' }),
    ).toBe('en');
    expect(
      detectLocale({ search: '?lang=pt', stored: 'en', navigatorLanguage: 'en-US' }),
    ).toBe('pt');
  });

  it('`?lang=` com valor inválido é ignorado, não quebra a página', () => {
    expect(detectLocale({ search: '?lang=klingon', navigatorLanguage: 'pt-BR' })).toBe('pt');
  });

  it('a escolha salva ganha do navegador — a pessoa já disse o que quer', () => {
    expect(detectLocale({ stored: 'pt', navigatorLanguage: 'en-US' })).toBe('pt');
    expect(detectLocale({ stored: 'en', navigatorLanguage: 'pt-BR' })).toBe('en');
  });

  it('sem escolha salva, segue o navegador', () => {
    expect(detectLocale({ navigatorLanguage: 'en-GB' })).toBe('en');
    expect(detectLocale({ navigatorLanguage: 'pt-BR' })).toBe('pt');
  });

  it('sem nenhum sinal, cai em português', () => {
    expect(detectLocale({})).toBe('pt');
  });

  // Esta guarda existe por um motivo concreto: o jsdom se declara `en-US`, e
  // sem ela TODA a suíte do produto passaria a rodar em inglês por acidente,
  // quebrando asserções em português por um motivo que nada tem a ver com o
  // que elas checam. Mesmo padrão do `useStepGuard` em MODE=test.
  it('em teste, o navegador é ignorado e o padrão é português', () => {
    expect(detectLocale({ navigatorLanguage: 'en-US', isTest: true })).toBe('pt');
  });

  it('mas em teste a URL e a escolha explícita continuam valendo', () => {
    expect(detectLocale({ search: '?lang=en', navigatorLanguage: 'en-US', isTest: true })).toBe(
      'en',
    );
    expect(detectLocale({ stored: 'en', navigatorLanguage: 'en-US', isTest: true })).toBe('en');
  });
});

describe('persistência', () => {
  it('guarda e lê a escolha', () => {
    persistLocale('en');
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en');
    expect(readStoredLocale()).toBe('en');
  });

  it('valor corrompido no storage é tratado como ausente', () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'klingon');
    expect(readStoredLocale()).toBeNull();
  });

  // Janela privada, cookies bloqueados, captura de thumbnail: o storage LANÇA.
  // Idioma é conveniência; não pode derrubar a página.
  it('storage que lança não quebra nem a leitura nem a escrita', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage bloqueado');
    });

    expect(() => persistLocale('en')).not.toThrow();
    expect(readStoredLocale()).toBeNull();
  });
});

describe('store', () => {
  it('avisa quem assinou quando o idioma muda', () => {
    const ouvinte = vi.fn();
    const cancelar = subscribeLocale(ouvinte);

    setLocale('en');
    expect(ouvinte).toHaveBeenCalledTimes(1);
    expect(getLocale()).toBe('en');

    cancelar();
    setLocale('pt');
    expect(ouvinte).toHaveBeenCalledTimes(1);
  });

  it('não avisa à toa quando o idioma é o mesmo', () => {
    const ouvinte = vi.fn();
    subscribeLocale(ouvinte);

    setLocale('pt');
    expect(ouvinte).not.toHaveBeenCalled();
  });
});

describe('applyDocumentLang', () => {
  // É o atributo que faz o leitor de tela escolher a voz certa e o navegador
  // oferecer tradução. `pt` vira `pt-BR`, que é o que o index.html sempre teve.
  it('escreve a tag BCP-47 certa no <html>', () => {
    applyDocumentLang('en');
    expect(document.documentElement.lang).toBe('en');

    applyDocumentLang('pt');
    expect(document.documentElement.lang).toBe('pt-BR');
  });
});
