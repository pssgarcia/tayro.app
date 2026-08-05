import { describe, it, expect } from 'vitest';
import {
  formatNumber,
  formatNumberParts,
  formatEngagement,
  formatCurrency,
  formatDate,
  formatOffer,
} from './format';

describe('formatNumber', () => {
  it('returns plain string for values below 1k', () => {
    expect(formatNumber(800)).toBe('800');
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(999)).toBe('999');
  });

  it('formats thousands as k with 1 decimal', () => {
    expect(formatNumber(1_000)).toBe('1.0k');
    expect(formatNumber(8_200)).toBe('8.2k');
    expect(formatNumber(10_500)).toBe('10.5k');
  });

  it('formats millions as M with 1 decimal', () => {
    expect(formatNumber(1_000_000)).toBe('1.0M');
    expect(formatNumber(1_500_000)).toBe('1.5M');
    expect(formatNumber(2_000_000)).toBe('2.0M');
  });
});

describe('formatNumberParts', () => {
  // Existe porque a UI renderiza o sufixo num <span> menor que o número. Antes
  // disso, as telas concatenavam um "k" fixo no fim de formatNumber() — que já
  // vinha com sufixo — e produziam "13,6Mk", "8,2kk" e, pior, "800k" pra quem
  // tinha 800 seguidores.
  it('separa valor e sufixo, com vírgula decimal (pt-BR)', () => {
    expect(formatNumberParts(13_600_000)).toEqual({ value: '13,6', suffix: 'M' });
    expect(formatNumberParts(8_200)).toEqual({ value: '8,2', suffix: 'k' });
  });

  it('abaixo de 1k não tem sufixo — 800 seguidores nunca vira "800k"', () => {
    expect(formatNumberParts(800)).toEqual({ value: '800', suffix: '' });
    expect(formatNumberParts(0)).toEqual({ value: '0', suffix: '' });
    expect(formatNumberParts(999)).toEqual({ value: '999', suffix: '' });
  });

  it('concatenar value+suffix reproduz formatNumber (com vírgula)', () => {
    for (const n of [0, 999, 1_000, 8_200, 10_500, 1_500_000, 13_600_000]) {
      const { value, suffix } = formatNumberParts(n);
      expect(value + suffix).toBe(formatNumber(n).replace('.', ','));
    }
  });
});

describe('formatEngagement', () => {
  it('uses comma as decimal separator (pt-BR)', () => {
    expect(formatEngagement(3.5)).toBe('3,5%');
    expect(formatEngagement(10.0)).toBe('10,0%');
    expect(formatEngagement(0.4)).toBe('0,4%');
  });
});

describe('formatCurrency', () => {
  it('converts centavos to BRL string', () => {
    // R$ 300,00
    const result = formatCurrency(30_000);
    expect(result).toContain('300');
    expect(result).toContain('R$');
  });

  it('handles zero centavos', () => {
    const result = formatCurrency(0);
    expect(result).toContain('R$');
    expect(result).toContain('0');
  });

  it('handles single real (100 centavos)', () => {
    const result = formatCurrency(100);
    expect(result).toContain('1');
  });
});

describe('formatDate', () => {
  it('formats an ISO date in pt-BR', () => {
    const result = formatDate('2026-06-15T12:00:00.000Z');
    expect(result).toContain('2026');
    expect(result).toMatch(/jun/i);
  });

  it('returns the default fallback for null', () => {
    expect(formatDate(null)).toBe('Sem prazo');
  });

  it('accepts a custom fallback', () => {
    expect(formatDate(null, '—')).toBe('—');
  });
});

describe('formatOffer', () => {
  it('formats a CASH offer as currency', () => {
    const result = formatOffer({
      offerType: 'CASH',
      offerAmount: 30_000,
      offerDescription: null,
    });
    expect(result).toContain('300');
    expect(result).toContain('R$');
  });

  it('uses the description for a PRODUCT offer', () => {
    expect(
      formatOffer({
        offerType: 'PRODUCT',
        offerAmount: null,
        offerDescription: 'Kit Whey 900g',
      }),
    ).toBe('Kit Whey 900g');
  });

  it('falls back to em dash when offer terms are missing', () => {
    expect(
      formatOffer({
        offerType: null,
        offerAmount: null,
        offerDescription: null,
      }),
    ).toBe('—');
  });
});
