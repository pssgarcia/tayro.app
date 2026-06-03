export type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'COMPLETED';
export type RewardType = 'MONETARY' | 'PRODUCT' | 'DISCOUNT';

export interface Campaign {
  id: string;
  brandId: string;
  title: string;
  description: string;
  briefUrl: string | null;
  status: CampaignStatus;
  niches: string[];
  maxSpots: number;
  rewardType: RewardType;
  rewardValue: string;
  deadline: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignDto {
  title: string;
  description: string;
  niches: string[];
  maxSpots: number;
  rewardType: RewardType;
  rewardValue: string;
  deadline?: string;
}

export interface UpdateCampaignDto {
  title?: string;
  description?: string;
  niches?: string[];
  maxSpots?: number;
  rewardType?: RewardType;
  rewardValue?: string;
  deadline?: string;
  status?: CampaignStatus;
}
