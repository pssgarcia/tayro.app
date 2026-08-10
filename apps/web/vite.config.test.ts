import { describe, expect, it } from 'vitest';
import { pwaOptions } from './vite.config';

/**
 * Regra inviolável (CLAUDE.md): o service worker NUNCA pode cachear /auth/*
 * nem qualquer outro endpoint sob /api/ — em produção /api/* é rewrite
 * same-origin pro Railway, então cache por URL ignorando header de auth
 * pode vazar resposta de um usuário pro próximo num dispositivo compartilhado.
 * Estes testes travam a config, não o comportamento do Workbox em si.
 */
describe('pwaOptions — regra /api/ nunca cacheado', () => {
  const runtimeCaching = pwaOptions.workbox?.runtimeCaching ?? [];

  it('tem uma regra NetworkOnly cobrindo /api/', () => {
    const apiRule = runtimeCaching.find((rule) => {
      const pattern = rule.urlPattern;
      if (!(pattern instanceof RegExp)) return false;
      return pattern.test('/api/v1/auth/refresh');
    });

    expect(apiRule).toBeDefined();
    expect(apiRule?.handler).toBe('NetworkOnly');
  });

  it('a regra NetworkOnly cobre dado autenticado e público sob /api/, não só /auth/', () => {
    const apiRule = runtimeCaching.find((rule) => rule.handler === 'NetworkOnly');
    const pattern = apiRule?.urlPattern as RegExp;

    expect(pattern.test('/api/v1/auth/refresh')).toBe(true);
    expect(pattern.test('/api/v1/campaigns/123')).toBe(true);
    expect(pattern.test('/api/v1/influencers/me')).toBe(true);
  });

  it('não há nenhuma regra de cache (que não seja NetworkOnly) casando com /api/', () => {
    const cachingRulesForApi = runtimeCaching.filter((rule) => {
      const pattern = rule.urlPattern;
      return pattern instanceof RegExp && pattern.test('/api/v1/campaigns/123');
    });

    for (const rule of cachingRulesForApi) {
      expect(rule.handler).toBe('NetworkOnly');
    }
  });

  it('navigateFallback nunca engole uma navegação sob /api/', () => {
    const denylist = pwaOptions.workbox?.navigateFallbackDenylist ?? [];
    const coversApi = denylist.some((pattern) => pattern.test('/api/v1/campaigns/123'));
    expect(coversApi).toBe(true);
  });
});

describe('pwaOptions — manifest e atualização', () => {
  it('registra como standalone com as cores da marca', () => {
    expect(pwaOptions.manifest?.display).toBe('standalone');
    expect(pwaOptions.manifest?.theme_color).toBe('#0A0A0A');
    expect(pwaOptions.manifest?.background_color).toBe('#0A0A0A');
  });

  it('tem os 3 ícones exigidos pra instalabilidade (192, 512, 512 maskable)', () => {
    const icons = pwaOptions.manifest?.icons ?? [];

    expect(icons).toContainEqual(
      expect.objectContaining({ sizes: '192x192', type: 'image/png' }),
    );
    expect(icons).toContainEqual(
      expect.objectContaining({ sizes: '512x512', type: 'image/png', src: 'pwa-512x512.png' }),
    );
    expect(icons).toContainEqual(
      expect.objectContaining({ sizes: '512x512', purpose: 'maskable' }),
    );
  });

  it('atualiza sozinho (autoUpdate) — sem prompt de UI nesta v1', () => {
    expect(pwaOptions.registerType).toBe('autoUpdate');
  });
});
