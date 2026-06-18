import { describe, it, expect } from 'vitest';
import {
  formatNumber,
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
