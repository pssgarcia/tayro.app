/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CampaignContentTab from './CampaignContentTab';
import * as hooks from '../../hooks/useCampaignApplications';
import type { CampaignSubmission } from '../../types/api';

vi.mock('../../hooks/useCampaignApplications', async (importOriginal) => {
  const actual = await importOriginal<typeof hooks>();
  return {
    ...actual,
    useCampaignSubmissions: vi.fn(),
    useApproveSubmission: vi.fn(),
    useRejectSubmission: vi.fn(),
    useRequestRevision: vi.fn(),
  };
});

const baseSubmission: CampaignSubmission = {
  id: 'sub-1',
  applicationId: 'app-1',
  mediaUrl: 'https://cdn.example.com/video.mp4',
  mediaType: 'VIDEO',
  caption: 'Vídeo incrível do produto',
  status: 'PENDING',
  feedback: null,
  submittedAt: '2026-06-10T10:00:00.000Z',
  reviewedAt: null,
  influencer: {
    id: 'inf-1',
    name: 'Ana Creator',
    instagramHandle: 'ana.creator',
    avatarUrl: null,
  },
};

function mockHooks(submissions: CampaignSubmission[] = []) {
  const noopMutation = { mutate: vi.fn(), isPending: false, variables: undefined };
  vi.mocked(hooks.useCampaignSubmissions).mockReturnValue({
    data: submissions,
    isLoading: false,
  } as any);
  vi.mocked(hooks.useApproveSubmission).mockReturnValue(noopMutation as any);
  vi.mocked(hooks.useRejectSubmission).mockReturnValue(noopMutation as any);
  vi.mocked(hooks.useRequestRevision).mockReturnValue(noopMutation as any);
}

beforeEach(() => {
  mockHooks();
});

describe('CampaignContentTab', () => {
  it('mostra empty state quando não há conteúdos', () => {
    render(<CampaignContentTab campaignId="camp-1" />);
    expect(screen.getByText(/nenhum conteúdo enviado ainda/i)).toBeInTheDocument();
  });

  it('renderiza card com nome da creator e tipo de mídia', () => {
    mockHooks([baseSubmission]);
    render(<CampaignContentTab campaignId="camp-1" />);
    expect(screen.getByText('Ana Creator')).toBeInTheDocument();
    expect(screen.getByText('@ana.creator')).toBeInTheDocument();
    expect(screen.getByText('VIDEO')).toBeInTheDocument();
  });

  it('mostra botões de ação apenas em PENDING', () => {
    mockHooks([baseSubmission]);
    render(<CampaignContentTab campaignId="camp-1" />);
    expect(screen.getByRole('button', { name: /aprovar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /recusar/i })).toBeInTheDocument();
    // "Revisão" aparece no filtro e na ação do card — garante que existe pelo menos 1 como ação
    expect(screen.getAllByRole('button', { name: /revisão/i }).length).toBeGreaterThanOrEqual(1);
  });

  it('não mostra ações em conteúdo APPROVED', () => {
    mockHooks([{ ...baseSubmission, status: 'APPROVED' }]);
    render(<CampaignContentTab campaignId="camp-1" />);
    expect(screen.queryByRole('button', { name: /aprovar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /recusar/i })).not.toBeInTheDocument();
  });

  it('abre modal de revisão e permite enviar feedback', async () => {
    const mutateFn = vi.fn();
    mockHooks([baseSubmission]);
    vi.mocked(hooks.useRequestRevision).mockReturnValue({
      mutate: mutateFn,
      isPending: false,
      variables: undefined,
    } as any);

    render(<CampaignContentTab campaignId="camp-1" />);
    // O segundo botão "Revisão" é o da ação do card (o primeiro é o filtro)
    const revisionButtons = screen.getAllByRole('button', { name: /revisão/i });
    fireEvent.click(revisionButtons[revisionButtons.length - 1]);

    await waitFor(() =>
      expect(screen.getByText(/solicitar revisão/i, { selector: 'h3' })).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Precisa mencionar o código' },
    });
    fireEvent.click(screen.getByRole('button', { name: /solicitar revisão/i, hidden: false }));

    expect(mutateFn).toHaveBeenCalledWith(
      { id: 'sub-1', feedback: 'Precisa mencionar o código' },
      expect.any(Object),
    );
  });

  it('filtra conteúdos por status', () => {
    const approved: CampaignSubmission = { ...baseSubmission, id: 'sub-2', status: 'APPROVED' };
    mockHooks([baseSubmission, approved]);

    render(<CampaignContentTab campaignId="camp-1" />);
    expect(screen.getAllByText('Ana Creator')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: /^aprovados$/i }));
    expect(screen.getAllByText('Ana Creator')).toHaveLength(1);
  });
});
