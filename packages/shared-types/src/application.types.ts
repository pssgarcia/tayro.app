export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';

export interface Application {
  id: string;
  campaignId: string;
  influencerId: string;
  status: ApplicationStatus;
  message: string | null;
  appliedAt: string;
  reviewedAt: string | null;
}

export interface CreateApplicationDto {
  message?: string;
}

export interface ReviewApplicationDto {
  status: 'APPROVED' | 'REJECTED';
}
