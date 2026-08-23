import type { Application, ApplicationStatus, Campaign } from '../../types/api';

/**
 * Fixtures da aba Fila (desktop + Story mobile). Ficam fora dos .spec pra que
 * os dois arquivos de teste exercitem exatamente o mesmo formato de dado que
 * `GET /applications/campaign/:id` devolve — divergir aqui esconderia bug de
 * contrato em vez de pegar.
 */
export function makeApplication(
  id: string,
  overrides: {
    status?: ApplicationStatus;
    name?: string;
    igFetchStatus?: 'PENDING' | 'OK' | 'FAILED' | null;
    message?: string | null;
  } = {},
): Application {
  const {
    status = 'PENDING',
    name = `Creator ${id}`,
    igFetchStatus = 'OK',
    message = null,
  } = overrides;

  return {
    id,
    campaignId: 'camp-1',
    influencerId: `inf-${id}`,
    status,
    message,
    appliedAt: '2026-08-20T10:00:00.000Z',
    reviewedAt: null,
    influencer: {
      id: `inf-${id}`,
      name,
      avatarUrl: null,
      instagramHandle: `creator${id}`,
      niches: ['fitness'],
      city: 'Belo Horizonte',
      followersCount: 12_000,
      igEngagementRate: 4.2,
      igRecentPosts: null,
      igProfilePicUrl: null,
      igFetchStatus,
    },
    _count: { submissions: 0 },
  };
}

export const campaignFixture: Campaign = {
  id: 'camp-1',
  brandId: 'brand-1',
  title: 'Campanha Verão',
  description: 'Conteúdo de treino',
  briefUrl: null,
  status: 'ACTIVE',
  niches: ['fitness'],
  maxSpots: 5,
  offerType: 'CASH',
  offerAmount: 30_000,
  offerDeadlineDays: 15,
  offerDescription: null,
  offerCommissionPercent: null,
  deadline: null,
  createdAt: '2026-08-01T10:00:00.000Z',
  _count: { applications: 0 },
};
