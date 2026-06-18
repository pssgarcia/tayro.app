import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import {
  ApplicationStatus,
  CampaignStatus,
  ContentStatus,
  RewardStatus,
} from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { QueryCounter } from '../../../shared/infrastructure/database/query-counter';

const group = (status: string, count: number) => ({
  status,
  _count: { _all: count },
});

describe('DashboardService.getForBrand', () => {
  let service: DashboardService;
  let prisma: jest.Mocked<any>;

  beforeEach(async () => {
    prisma = {
      brand: { findUnique: jest.fn() },
      campaign: { groupBy: jest.fn() },
      application: { groupBy: jest.fn() },
      contentSubmission: { count: jest.fn() },
      reward: { groupBy: jest.fn() },
      // $transaction com array: resolve todas as PrismaPromise (mockResolvedValue)
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(DashboardService);
  });

  function mockBrandWithData() {
    prisma.brand.findUnique.mockResolvedValue({
      id: 'brand-1',
      userId: 'user-1',
    });
    prisma.campaign.groupBy.mockResolvedValue([
      group(CampaignStatus.ACTIVE, 3),
      group(CampaignStatus.DRAFT, 2),
      group(CampaignStatus.CLOSED, 1),
    ]);
    prisma.application.groupBy.mockResolvedValue([
      group(ApplicationStatus.PENDING, 5),
      group(ApplicationStatus.APPROVED, 4),
      group(ApplicationStatus.REJECTED, 1),
    ]);
    prisma.contentSubmission.count.mockResolvedValue(7);
    prisma.reward.groupBy.mockResolvedValue([
      group(RewardStatus.PENDING, 2),
      group(RewardStatus.ISSUED, 1),
      group(RewardStatus.DELIVERED, 3),
    ]);
  }

  it('lança ForbiddenException se o usuário não tem brand', async () => {
    prisma.brand.findUnique.mockResolvedValue(null);
    await expect(service.getForBrand('user-1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('agrega campanhas por status com total', async () => {
    mockBrandWithData();
    const result = await service.getForBrand('user-1');
    expect(result.campaigns).toEqual({
      total: 6,
      active: 3,
      draft: 2,
      closed: 1,
      completed: 0,
    });
  });

  it('agrega candidaturas por status com total', async () => {
    mockBrandWithData();
    const result = await service.getForBrand('user-1');
    expect(result.applications).toEqual({
      total: 10,
      pending: 5,
      approved: 4,
      rejected: 1,
    });
  });

  it('expõe conteúdos aguardando revisão (PENDING)', async () => {
    mockBrandWithData();
    const result = await service.getForBrand('user-1');
    expect(result.content.pendingReview).toBe(7);
    // o count deve filtrar por status PENDING e escopo da brand
    expect(prisma.contentSubmission.count).toHaveBeenCalledWith({
      where: {
        status: ContentStatus.PENDING,
        application: { campaign: { brandId: 'brand-1' } },
      },
    });
  });

  it('agrega recompensas por status com total', async () => {
    mockBrandWithData();
    const result = await service.getForBrand('user-1');
    expect(result.rewards).toEqual({
      total: 6,
      pending: 2,
      issued: 1,
      delivered: 3,
    });
  });

  it('retorna zeros quando a brand não tem nenhum dado', async () => {
    prisma.brand.findUnique.mockResolvedValue({
      id: 'brand-1',
      userId: 'user-1',
    });
    prisma.campaign.groupBy.mockResolvedValue([]);
    prisma.application.groupBy.mockResolvedValue([]);
    prisma.contentSubmission.count.mockResolvedValue(0);
    prisma.reward.groupBy.mockResolvedValue([]);

    const result = await service.getForBrand('user-1');

    expect(result.campaigns.total).toBe(0);
    expect(result.applications.total).toBe(0);
    expect(result.content.pendingReview).toBe(0);
    expect(result.rewards.total).toBe(0);
  });

  it('usa um número fixo de queries (sem N+1, independente do volume)', async () => {
    const counter = new QueryCounter();
    counter.wrap(prisma);
    mockBrandWithData();

    await service.getForBrand('user-1');

    // 1 lookup de brand + 4 agregações — nunca por-campanha
    counter.assertAtMost('brand', 'findUnique', 1);
    counter.assertAtMost('campaign', 'groupBy', 1);
    counter.assertAtMost('application', 'groupBy', 1);
    counter.assertAtMost('contentSubmission', 'count', 1);
    counter.assertAtMost('reward', 'groupBy', 1);
  });
});
