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
