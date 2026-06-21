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
  name: string;
  avatarUrl: string | null;
  instagramHandle: string | null;
  niches: string[];
  city: string | null;
  followersCount: number | null;
  igEngagementRate: number | null;
  igRecentPosts: IgPost[] | null;
  igFetchStatus: IgFetchStatus | null;
}

// ─── Application ───────────────────────────────────────────────────────────────

export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';

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
  avatarUrl: string | null;
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
  bio: string | null;
  city: string | null;
  niches: string[];
  instagramHandle: string | null; // read-only neste fluxo
  tiktokHandle: string | null;
  followersCount: number | null;
  igEngagementRate: number | null;
  igFetchStatus: string | null;
  publicProfileEnabled: boolean;
  createdAt: string;
}

export interface UpdateInfluencerPayload {
  name?: string;
  avatarUrl?: string;
  bio?: string;
  city?: string;
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
    name: string;
    avatarUrl: string | null;
    instagramHandle: string | null;
  };
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
    brand: { name: string; logoUrl: string | null };
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

// ─── Campaign ──────────────────────────────────────────────────────────────────

export type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'COMPLETED';
export type OfferType = 'CASH' | 'PRODUCT';

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
  offerAmount: number | null;      // centavos
  offerDeadlineDays: number | null;
  offerDescription: string | null;
  deadline: string | null;
  createdAt: string;
  brand?: { name: string; logoUrl: string | null; website: string | null };
  _count: { applications: number };
}
