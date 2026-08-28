import type {
  ApplicationStatus,
  CampaignStatus,
  ContentStatus,
  RewardStatus,
} from '../types/api';

/**
 * Rótulo em português de cada status de candidatura, no feminino (concorda com
 * "candidatura"). Fonte única — usado pela lista Pipeline do desktop e pela
 * lista "Todas" da revisão mobile.
 */
export const applicationStatusWord: Record<ApplicationStatus, string> = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovada',
  REJECTED: 'Recusada',
  WITHDRAWN: 'Retirada',
};

/**
 * Rótulo em português de cada status de campanha, no feminino (concorda com
 * "campanha"). Vivia preso dentro de `StatusPill.tsx`; virou fonte única
 * quando o Kinetic passou a mostrar status como palavra, sem pill.
 */
export const campaignStatusWord: Record<CampaignStatus, string> = {
  DRAFT: 'Rascunho',
  ACTIVE: 'Ativa',
  CLOSED: 'Encerrada',
  COMPLETED: 'Concluída',
};

/**
 * Rótulo em português de cada status de conteúdo, no MASCULINO (concorda com
 * "conteúdo") — por isso "Aprovado", não "Aprovada" como na candidatura.
 * `ContentStatus` não é `ApplicationStatus`: além do gênero, tem
 * REVISION_REQUESTED e não tem WITHDRAWN. Vivia preso em
 * `ContentStatusPill.tsx`.
 */
export const contentStatusWord: Record<ContentStatus, string> = {
  PENDING: 'Em análise',
  APPROVED: 'Aprovado',
  REJECTED: 'Recusado',
  REVISION_REQUESTED: 'Revisar',
};

/**
 * Rótulo em português de cada status de recompensa, no feminino (concorda com
 * "recompensa"). Vivia preso no `STATUS_CONFIG` do `CampaignRewardsTab`.
 */
export const rewardStatusWord: Record<RewardStatus, string> = {
  PENDING: 'Pendente',
  ISSUED: 'Emitida',
  DELIVERED: 'Entregue',
};

/**
 * Alfabeto aceito pro handle do Instagram: letras, números, ponto e
 * underscore, sem @, até 30 caracteres.
 *
 * Fonte única do formato — até 2026-08-27 essa regex vivia copiada em
 * `PublicApplyPage` e `RegisterInfluencerPage`. Mudar o alfabeto aceito
 * exigia lembrar de todos os lugares; agora exige mudar aqui e no
 * equivalente do backend (`shared/validation/instagram-handle.ts`).
 */
export const INSTAGRAM_HANDLE_FORMAT = /^[a-zA-Z0-9_.]{1,30}$/;

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

/**
 * Fonte da foto de uma creator, em ordem de verdade:
 *   1. a foto do Instagram, servida pelo nosso domínio (o Instagram bloqueia
 *      `<img>` cross-origin em foto de PERFIL — ver footgun CORP no CLAUDE.md);
 *   2. `avatarUrl`, campo que só a própria creator digita e que na prática
 *      está sempre vazio — fallback, nunca a regra;
 *   3. `null` → quem chama mostra as iniciais.
 *
 * Existe pra que "a foto do TAYRO é a do Instagram" seja UMA regra, num lugar
 * só. Estava copiada em 5 telas e faltando em outras 2 (Entregas e
 * Recompensas), que por isso mostravam iniciais pra praticamente todo mundo.
 *
 * `ClaimAccountPage` fica de fora de propósito: o preview do claim não expõe a
 * URL da CDN, só um booleano `hasIgAvatar` — um DTO mais fechado que os
 * outros. Encaixá-lo aqui exigiria vazar a URL, o que seria piorar.
 */
export function creatorAvatarSrc(influencer: {
  id: string;
  igProfilePicUrl?: string | null;
  avatarUrl?: string | null;
}): string | null {
  if (influencer.igProfilePicUrl) return `/api/v1/ig/avatar/${influencer.id}`;
  return influencer.avatarUrl ?? null;
}

/**
 * Endereço de uma thumbnail do feed recente, servida pelo nosso domínio.
 *
 * Mesma razão do `creatorAvatarSrc`: as URLs da CDN do Instagram são assinadas
 * e expiram, e até 2026-08-23 o navegador as carregava direto — por isso o
 * feed da Fila ia sumindo com o tempo (D-18). `position` é o índice do post na
 * grade (0..5).
 */
export function creatorPostSrc(influencerId: string, position: number): string {
  return `/api/v1/ig/post/${influencerId}/${position}`;
}

/**
 * URL absoluta de uma rota pública, no domínio em que a aplicação está rodando.
 *
 * É o endereço que a marca copia pra divulgar o programa e que a creator manda
 * pras marcas — ou seja, sai do produto e vai pro mundo. Por isso ele não pode
 * ser um literal: até 2026-08-24 o código montava `https://tayro.app/...`, um
 * domínio que **nunca existiu** (NXDOMAIN). Todo link copiado desde a v0.29.0
 * estava morto, e ninguém percebeu porque nenhum teste sai da máquina.
 *
 * Derivar da origem resolve os três ambientes de uma vez (localhost, preview da
 * Vercel, produção) e continua certo no dia em que um domínio próprio for
 * comprado e apontado — sem tocar em código.
 */
export function publicUrl(path: string): string {
  return `${window.location.origin}${path}`;
}

/** Mesmo endereço do `publicUrl`, sem o esquema — para exibir, não para copiar. */
export function publicUrlLabel(path: string): string {
  return `${window.location.host}${path}`;
}
