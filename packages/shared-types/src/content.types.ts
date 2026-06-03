export type ContentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED';
export type MediaType = 'IMAGE' | 'VIDEO' | 'REEL' | 'STORY';

export interface ContentSubmission {
  id: string;
  applicationId: string;
  mediaUrl: string;
  mediaType: MediaType;
  caption: string | null;
  status: ContentStatus;
  feedback: string | null;
  submittedAt: string;
  reviewedAt: string | null;
}

export interface CreateSubmissionDto {
  mediaType: MediaType;
  caption?: string;
}

export interface ReviewSubmissionDto {
  status: 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED';
  feedback?: string;
}

export interface PresignedUploadResponse {
  uploadUrl: string;
  mediaUrl: string;
  expiresIn: number;
}
