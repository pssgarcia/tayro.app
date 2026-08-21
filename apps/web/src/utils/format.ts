/** 8200 → "8.2k" | 1500000 → "1.5M" | 800 → "800" */
export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

/**
 * Mesma escala do formatNumber, mas com o sufixo separado — a UI do redesign 2a
 * renderiza o "k"/"M" num <span> menor que o número. Quem precisa disso DEVE usar
 * esta função: concatenar um sufixo fixo em cima do formatNumber() duplica o que
 * ele já devolve ("13,6Mk") e, abaixo de 1k, inventa escala ("800" → "800k").
 * Vírgula decimal (pt-BR), igual ao resto do produto.
 */
export function formatNumberParts(n: number): { value: string; suffix: string } {
  if (n >= 1_000_000) {
    return { value: (n / 1_000_000).toFixed(1).replace('.', ','), suffix: 'M' };
  }
  if (n >= 1_000) {
    return { value: (n / 1_000).toFixed(1).replace('.', ','), suffix: 'k' };
  }
  return { value: n.toString(), suffix: '' };
}

/** 3.5 → "3,5%" */
export function formatEngagement(rate: number): string {
  return `${rate.toFixed(1).replace('.', ',')}%`;
}

/** 10 → "10%" | 12.5 → "12,5%" — sem casa decimal forçada (diferente de formatEngagement). */
export function formatPercent(value: number): string {
  return `${Number.isInteger(value) ? value : value.toFixed(1).replace('.', ',')}%`;
}

/** centavos → "R$ 300,00" */
export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

/** ISO → "15 de jun. de 2026" | null → fallback */
export function formatDate(iso: string | null, fallback = 'Sem prazo'): string {
  if (!iso) return fallback;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

/** ISO → dias corridos até a data (nunca negativo) | null → null */
export function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const diffMs = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / 86_400_000));
}

/** Termos da oferta de uma campanha em texto curto. */
export function formatOffer(offer: {
  offerType: 'CASH' | 'PRODUCT' | 'COMMISSION' | null;
  offerAmount: number | null;
  offerDescription: string | null;
  offerCommissionPercent?: number | null;
}): string {
  if (offer.offerType === 'CASH' && offer.offerAmount != null) {
    return formatCurrency(offer.offerAmount);
  }
  if (offer.offerType === 'PRODUCT' && offer.offerDescription) {
    return offer.offerDescription;
  }
  if (offer.offerType === 'COMMISSION' && offer.offerCommissionPercent != null) {
    return `${formatPercent(offer.offerCommissionPercent)} por venda`;
  }
  return '—';
}

/**
 * Oferta em reais inteiros, sem centavos — pra contextos de escaneio
 * (Abertos, Registro). O valor exato com centavos só importa na hora de
 * decidir (Apply), que usa formatCurrency.
 */
export function formatOfferWhole(offer: {
  offerType: 'CASH' | 'PRODUCT' | 'COMMISSION' | null;
  offerAmount: number | null;
  offerCommissionPercent?: number | null;
}): { prefix?: string; value: string } | null {
  if (offer.offerType === 'CASH' && offer.offerAmount != null) {
    return { prefix: 'R$ ', value: String(Math.round(offer.offerAmount / 100)) };
  }
  if (offer.offerType === 'PRODUCT') {
    return { value: 'produto' };
  }
  if (offer.offerType === 'COMMISSION' && offer.offerCommissionPercent != null) {
    return { value: formatPercent(offer.offerCommissionPercent) };
  }
  return null;
}

/** ISO → "hoje" | "há 1 dia" | "há N dias" */
export function formatRelativeDays(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'hoje';
  if (days === 1) return 'há 1 dia';
  return `há ${days} dias`;
}
