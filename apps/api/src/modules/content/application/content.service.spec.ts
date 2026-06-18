import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ContentService } from './content.service';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { QueryCounter } from '../../../shared/infrastructure/database/query-counter';

const makeCampaign = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'camp-1',
  brand: { id: 'brand-1', userId: 'user-brand-1' },
  ...overrides,
});

const makeSubmission = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'sub-1',
  applicationId: 'app-1',
  mediaUrl: 'https://cdn.example.com/video.mp4',
  mediaType: 'VIDEO',
  caption: 'Conteúdo incrível',
  status: 'PENDING',
  feedback: null,
  submittedAt: new Date('2026-06-01'),
  reviewedAt: null,
  application: {
    influencer: {
      id: 'inf-1',
      name: 'Ana Creator',
      instagramHandle: 'ana.creator',
      avatarUrl: null,
    },
  },
  ...overrides,
});

describe('ContentService.findByCampaign', () => {
  let service: ContentService;
  let prisma: jest.Mocked<any>;

  beforeEach(async () => {
    prisma = {
      campaign: { findUnique: jest.fn() },
      contentSubmission: { findMany: jest.fn() },
      influencer: { findUnique: jest.fn() },
      application: { findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ContentService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(ContentService);
  });

  it('retorna submissions da campanha com info da influencer', async () => {
    prisma.campaign.findUnique.mockResolvedValue(makeCampaign());
    const sub = makeSubmission();
    prisma.contentSubmission.findMany.mockResolvedValue([sub]);

    const result = await service.findByCampaign('camp-1', 'user-brand-1');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('sub-1');
    expect(result[0].influencer.name).toBe('Ana Creator');
    expect(result[0].influencer.instagramHandle).toBe('ana.creator');
    // Não deve expor application nested
    expect((result[0] as any).application).toBeUndefined();
  });

  it('lança NotFoundException se campanha não existe', async () => {
    prisma.campaign.findUnique.mockResolvedValue(null);

    await expect(
      service.findByCampaign('nonexistent', 'user-brand-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('lança ForbiddenException se userId não é dono da campanha', async () => {
    prisma.campaign.findUnique.mockResolvedValue(makeCampaign());

    await expect(
      service.findByCampaign('camp-1', 'user-outro'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('retorna lista vazia quando não há conteúdos', async () => {
    prisma.campaign.findUnique.mockResolvedValue(makeCampaign());
    prisma.contentSubmission.findMany.mockResolvedValue([]);

    const result = await service.findByCampaign('camp-1', 'user-brand-1');

    expect(result).toEqual([]);
  });

  it('faz no máximo 2 queries (sem N+1)', async () => {
    const counter = new QueryCounter();
    counter.wrap(prisma);
    prisma.campaign.findUnique.mockResolvedValue(makeCampaign());
    prisma.contentSubmission.findMany.mockResolvedValue([
      makeSubmission({ id: 'sub-1' }),
      makeSubmission({ id: 'sub-2' }),
      makeSubmission({ id: 'sub-3' }),
    ]);

    await service.findByCampaign('camp-1', 'user-brand-1');

    counter.assertAtMost('campaign', 'findUnique', 1, 'busca da campanha');
    counter.assertAtMost(
      'contentSubmission',
      'findMany',
      1,
      'busca de submissions',
    );
  });
});
