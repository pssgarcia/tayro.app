import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { MySubmission } from '../types/api';

export const mySubmissionKeys = {
  all: ['submissions', 'mine'] as const,
};

export function useMySubmissions() {
  return useQuery({
    queryKey: mySubmissionKeys.all,
    queryFn: () => api.get<MySubmission[]>('/submissions/mine').then((r) => r.data),
  });
}

export interface CreateSubmissionPayload {
  applicationId: string;
  mediaUrl: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'REEL' | 'STORY';
  caption?: string;
}

export function useCreateSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSubmissionPayload) =>
      api.post<MySubmission>('/submissions', payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: mySubmissionKeys.all }),
  });
}
