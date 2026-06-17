/** 8200 → "8.2k" | 1500000 → "1.5M" | 800 → "800" */
export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

/** 3.5 → "3,5%" */
export function formatEngagement(rate: number): string {
  return `${rate.toFixed(1).replace('.', ',')}%`;
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

/** Termos da oferta de uma campanha em texto curto. */
export function formatOffer(offer: {
  offerType: 'CASH' | 'PRODUCT' | null;
  offerAmount: number | null;
  offerDescription: string | null;
}): string {
  if (offer.offerType === 'CASH' && offer.offerAmount != null) {
    return formatCurrency(offer.offerAmount);
  }
  if (offer.offerType === 'PRODUCT' && offer.offerDescription) {
    return offer.offerDescription;
  }
  return '—';
}
