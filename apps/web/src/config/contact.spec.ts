import { describe, it, expect } from 'vitest';
import { resolveContactConfig } from './contact';

function env(overrides: Partial<ImportMetaEnv> = {}): ImportMetaEnv {
  return { MODE: 'test', ...overrides } as ImportMetaEnv;
}

describe('resolveContactConfig', () => {
  it('sem VITE_CONTACT_WHATSAPP, whatsappUrl fica undefined', () => {
    expect(resolveContactConfig(env()).whatsappUrl).toBeUndefined();
  });

  it('valor só com espaços/máscara vazia conta como ausente', () => {
    expect(resolveContactConfig(env({ VITE_CONTACT_WHATSAPP: '   ' })).whatsappUrl).toBeUndefined();
    expect(resolveContactConfig(env({ VITE_CONTACT_WHATSAPP: '+() -' })).whatsappUrl).toBeUndefined();
  });

  it('normaliza número mascarado pra só dígitos no link wa.me', () => {
    const cfg = resolveContactConfig(env({ VITE_CONTACT_WHATSAPP: '+55 (37) 99993-1492' }));
    expect(cfg.whatsappUrl).toBe(
      'https://wa.me/5537999931492?text=Oi!%20Vi%20o%20TAYRO%20e%20queria%20entender%20como%20funciona%20pra%20minha%20marca.',
    );
  });

  it('aceita número já normalizado', () => {
    const cfg = resolveContactConfig(env({ VITE_CONTACT_WHATSAPP: '5537999931492' }));
    expect(cfg.whatsappUrl).toContain('https://wa.me/5537999931492?text=');
  });

  it('a mensagem pré-preenchida vem codificada', () => {
    const cfg = resolveContactConfig(env({ VITE_CONTACT_WHATSAPP: '5537999931492' }));
    expect(decodeURIComponent(cfg.whatsappUrl!.split('text=')[1])).toBe(
      'Oi! Vi o TAYRO e queria entender como funciona pra minha marca.',
    );
  });
});
