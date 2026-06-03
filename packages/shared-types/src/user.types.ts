export type UserRole = 'BRAND' | 'INFLUENCER' | 'ADMIN';

export interface BrandProfile {
  id: string;
  userId: string;
  name: string;
  logoUrl: string | null;
  niches: string[];
  website: string | null;
  bio: string | null;
  createdAt: string;
}

export interface InfluencerProfile {
  id: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  instagramHandle: string | null;
  tiktokHandle: string | null;
  followersCount: number | null;
  niches: string[];
  city: string | null;
  createdAt: string;
}

export interface UpdateBrandDto {
  name?: string;
  logoUrl?: string;
  niches?: string[];
  website?: string;
  bio?: string;
}

export interface UpdateInfluencerDto {
  name?: string;
  avatarUrl?: string;
  bio?: string;
  instagramHandle?: string;
  tiktokHandle?: string;
  followersCount?: number;
  niches?: string[];
  city?: string;
}
