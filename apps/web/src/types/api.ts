// ─── Instagram ─────────────────────────────────────────────────────────────────

export type IgFetchStatus = 'OK' | 'PENDING' | 'FAILED';

export interface IgPost {
  url: string;
  thumbnail: string;
  likes: number;
  comments: number;
}

// ─── Influencer (shape devolvido nas applications) ────────────────────────────

export interface ApplicationInfluencer {
  id: string;
  name: string;
  avatarUrl: string | null;
  phone: string | null;
  instagramHandle: string | null;
  niches: string[];
  city: string | null;
  followersCount: number | null;
  igEngagementRate: number | null;
  igRecentPosts: IgPost[] | null;
  igProfilePicUrl: string | null;
  igFetchStatus: IgFetchStatus | null;
}

// ─── Application ───────────────────────────────────────────────────────────────

export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';

// ─── Creators aprovadas, cross-campanha (specs/creator-roster) ────────────────

export interface ApprovedCreatorApproval {
  applicationId: string;
  campaignId: string;
  campaignTitle: string;
  reviewedAt: string | null;
}

export interface ApprovedCreator {
  influencer: ApplicationInfluencer;
  approvals: ApprovedCreatorApproval[];
}

export interface Application {
  id: string;
  campaignId: string;
  influencerId: string;
  status: ApplicationStatus;
  message: string | null;
  appliedAt: string;
  reviewedAt: string | null;
  influencer: ApplicationInfluencer;
  _count: { submissions: number };
}

// ─── Content Submission ────────────────────────────────────────────────────────

export type ContentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED';
export type MediaType = 'IMAGE' | 'VIDEO' | 'REEL' | 'STORY';

export interface SubmissionInfluencer {
  id: string;
  name: string;
  instagramHandle: string | null;
  /** Preenchido à mão pela creator; hoje quase sempre vazio. Fallback só. */
  avatarUrl: string | null;
  /** Existe quando o sync do IG trouxe a foto — é a fonte de verdade da foto. */
  igProfilePicUrl: string | null;
}

export interface CampaignSubmission {
  id: string;
  applicationId: string;
  mediaUrl: string;
  mediaType: MediaType;
  caption: string | null;
  status: ContentStatus;
  feedback: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  influencer: SubmissionInfluencer;
}

// ─── Brand Profile ─────────────────────────────────────────────────────────────

export interface BrandProfile {
  id: string;
  name: string;
  email: string;
  logoUrl: string | null;
  niches: string[];
  website: string | null;
  bio: string | null;
  createdAt: string;
}

export interface UpdateBrandPayload {
  name?: string;
  logoUrl?: string;
  niches?: string[];
  website?: string;
  bio?: string;
}

// ─── Perfil do creator ───────────────────────────────────────────────────────────

export interface InfluencerProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  /** Foto do Instagram. Exibir via `creatorAvatarSrc` (proxy), nunca direto. */
  igProfilePicUrl: string | null;
  bio: string | null;
  city: string | null;
  phone: string | null;
  niches: string[];
  instagramHandle: string | null; // read-only neste fluxo
  tiktokHandle: string | null;
  followersCount: number | null;
  igEngagementRate: number | null;
  igFetchStatus: string | null;
  publicProfileEnabled: boolean;
  createdAt: string;
}

// ─── Perfil público do creator (/c/:handle) ─────────────────────────────────

export interface PublicCreatorProfile {
  id: string;
  handle: string;
  name: string;
  avatarUrl: string | null;
  igProfilePicUrl: string | null;
  bio: string | null;
  niches: string[];
  city: string | null;
  followersCount: number | null;
  igEngagementRate: number | null;
  igRecentPosts: IgPost[] | null;
  igFetchStatus: IgFetchStatus | null;
  /** Só sai quando o perfil está público (o endpoint devolve 404 se não). */
  phone: string | null;
  /**
   * Regra pública: candidatura aprovada com conteúdo aprovado OU com
   * resultado informado pela marca. Ver specs/partnership-results.
   */
  completedPartnerships: number;
  /**
   * Só os resultados com os DOIS consentimentos (marca liberou + creator não
   * escondeu). Os flags de consentimento não vêm — são controle, não
   * conteúdo. `brandName` é quem atestou: número sem autor não é histórico.
   */
  results: PublicPartnershipResult[];
}

export interface PublicPartnershipResult {
  reach: number | null;
  impressions: number | null;
  couponsUsed: number | null;
  note: string | null;
  createdAt: string;
  brandName: string;
  campaignTitle: string;
}

export interface UpdateInfluencerPayload {
  name?: string;
  avatarUrl?: string;
  bio?: string;
  city?: string;
  /** String vazia apaga o telefone (a API grava null). */
  phone?: string;
  niches?: string[];
  tiktokHandle?: string;
  publicProfileEnabled?: boolean;
}

// ─── Paginação (espelha buildPaginatedResult da API) ─────────────────────────────

export interface Paginated<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────

export interface BrandDashboard {
  campaigns: {
    total: number;
    active: number;
    draft: number;
    closed: number;
    completed: number;
  };
  applications: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  content: {
    pendingReview: number;
  };
  rewards: {
    total: number;
    pending: number;
    issued: number;
    delivered: number;
  };
}

// ─── Reward ────────────────────────────────────────────────────────────────────

export type RewardType = 'MONETARY' | 'PRODUCT' | 'DISCOUNT';
export type RewardStatus = 'PENDING' | 'ISSUED' | 'DELIVERED';

export interface CampaignReward {
  id: string;
  influencerId: string;
  campaignId: string;
  type: RewardType;
  value: string;
  status: RewardStatus;
  notes: string | null;
  issuedAt: string | null;
  createdAt: string;
  influencer: {
    id: string;
    name: string;
    avatarUrl: string | null;
    instagramHandle: string | null;
    igProfilePicUrl: string | null;
  };
}

// ─── Resultado de parceria (histórico verificado + transparência bilateral) ──
// Números DECLARADOS pela marca: não são medidos por nós e toda superfície que
// os mostra diz isso (vision.md nº 5). Ver specs/partnership-results.

export interface PartnershipResult {
  id: string;
  applicationId: string;
  reach: number | null;
  impressions: number | null;
  couponsUsed: number | null;
  note: string | null;
  /** Consentimento da marca pra este resultado aparecer em /c/:handle. */
  brandAllowsPublic: boolean;
  /** Opt-out da creator sobre o próprio perfil, item a item. */
  hiddenByCreator: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Uma parceria (candidatura aprovada) da campanha, com resultado ou sem. */
export interface CampaignPartnership {
  applicationId: string;
  reviewedAt: string | null;
  influencer: {
    id: string;
    name: string;
    avatarUrl: string | null;
    instagramHandle: string | null;
    igProfilePicUrl: string | null;
  };
  result: PartnershipResult | null;
}

/** Lado creator — GET /partnership-results/mine (achatado pela API). */
export interface MyPartnershipResult {
  id: string;
  applicationId: string;
  campaignId: string;
  campaignTitle: string;
  brandName: string;
  reach: number | null;
  impressions: number | null;
  couponsUsed: number | null;
  note: string | null;
  brandAllowsPublic: boolean;
  hiddenByCreator: boolean;
  createdAt: string;
}

export interface PartnershipResultPayload {
  reach?: number | null;
  impressions?: number | null;
  couponsUsed?: number | null;
  note?: string | null;
  brandAllowsPublic?: boolean;
}

// ─── My Application (lado creator — GET /applications/mine) ──────────────────────

export interface MyApplication {
  id: string;
  campaignId: string;
  status: ApplicationStatus;
  message: string | null;
  appliedAt: string;
  reviewedAt: string | null;
  campaign: {
    title: string;
    status: CampaignStatus;
    deadline: string | null;
    offerType: OfferType | null;
    offerAmount: number | null;
    offerDeadlineDays: number | null;
    offerDescription: string | null;
    offerCommissionPercent: number | null;
    brand: { name: string; logoUrl: string | null };
  };
}

// ─── My Submission (lado creator — GET /submissions/mine) ────────────────────

export interface MySubmission {
  id: string;
  applicationId: string;
  mediaUrl: string;
  mediaType: MediaType;
  caption: string | null;
  status: ContentStatus;
  feedback: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  application: {
    campaign: {
      title: string;
      brand: { name: string };
    };
  };
}

// ─── My Reward (lado creator — GET /rewards/mine) ────────────────────────────

export interface MyReward {
  id: string;
  type: RewardType;
  value: string;
  status: RewardStatus;
  notes: string | null;
  issuedAt: string | null;
  createdAt: string;
  campaign: {
    title: string;
    brand: { name: string };
  };
}

// ─── Claim (GET /auth/claim/:token — preview, não consome o token) ──────────

export interface ClaimPreview {
  instagramHandle: string | null;
  email: string;
  avatarUrl: string | null;
  influencerId: string;
  hasIgAvatar: boolean;
  campaignTitle: string | null;
}

// ─── Campaign ──────────────────────────────────────────────────────────────────

export type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'COMPLETED';
export type OfferType = 'CASH' | 'PRODUCT' | 'COMMISSION';

export interface Campaign {
  id: string;
  brandId: string;
  title: string;
  description: string;
  briefUrl: string | null;
  status: CampaignStatus;
  niches: string[];
  maxSpots: number;
  offerType: OfferType | null;
  offerAmount: number | null; // centavos
  offerDeadlineDays: number | null;
  offerDescription: string | null;
  offerCommissionPercent: number | null;
  deadline: string | null;
  createdAt: string;
  brand?: { name: string; logoUrl: string | null; website: string | null };
  _count: { applications: number };
  /** Só em GET /campaigns/mine — total de candidaturas APROVADAS (vagas preenchidas). */
  approvedCount?: number;
  /** Só em GET /campaigns/mine — total de candidaturas PENDING (na fila). */
  pendingCount?: number;
}

/**
 * Desfecho de GET /ig/handle/:handle. Só três, de propósito: "não existe"
 * só é afirmado com resposta conclusiva — qualquer ambiguidade vira
 * indeterminado. Nunca vem junto com dado de perfil. Ver specs/instagram-sync.
 */
export type HandleCheckResult = 'FOUND' | 'NOT_FOUND' | 'UNKNOWN';

export interface HandleCheckResponse {
  handle: string;
  result: HandleCheckResult;
}
