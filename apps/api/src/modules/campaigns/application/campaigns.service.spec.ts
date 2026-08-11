import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { CampaignStatus } from '@prisma/client';
import { CampaignsService } from './campaigns.service';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';

const makeBrand = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'brand-1',
  userId: 'user-1',
  name: 'Lilo',
  ...overrides,
});

const makeCampaign = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'camp-1',
  title: 'Verão 2026',
  status: CampaignStatus.ACTIVE,
  brandId: 'brand-1',
  brand: makeBrand(),
  _count: { applications: 0 },
  ...overrides,
});

describe('CampaignsService', () => {
  let service: CampaignsService;
  let prisma: jest.Mocked<any>;

  beforeEach(async () => {
    prisma = {
      campaign: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      application: {
        groupBy: jest.fn(),
      },
      brand: {
        findUnique: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(CampaignsService);
  });

  // ─── findAll ──────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    beforeEach(() => {
      prisma.$transaction.mockResolvedValue([[makeCampaign()], 1]);
    });

    it('returns paginated ACTIVE campaigns regardless of viewer', async () => {
      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('logs an anonymous view when no viewer id is given', async () => {
      const logSpy = jest
        .spyOn((service as any).logger, 'log')
        .mockImplementation();

      await service.findAll({ page: 1, limit: 20 });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('anonymous=true'),
      );
      logSpy.mockRestore();
    });

    it('logs an authenticated view when a viewer id is given', async () => {
      const logSpy = jest
        .spyOn((service as any).logger, 'log')
        .mockImplementation();

      await service.findAll({ page: 1, limit: 20 }, 'user-1');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('anonymous=false'),
      );
      logSpy.mockRestore();
    });
  });

  // ─── findOne ──────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns ACTIVE campaign to any viewer (including unauthenticated)', async () => {
      prisma.campaign.findUnique.mockResolvedValue(makeCampaign());

      const result = await service.findOne('camp-1');

      expect(result.id).toBe('camp-1');
      expect(result.status).toBe(CampaignStatus.ACTIVE);
    });

    it('returns ACTIVE campaign to authenticated viewer that is not the owner', async () => {
      prisma.campaign.findUnique.mockResolvedValue(makeCampaign());

      const result = await service.findOne('camp-1', 'other-user');

      expect(result.id).toBe('camp-1');
    });

    it('logs an anonymous view when an ACTIVE campaign is returned without a viewer id', async () => {
      prisma.campaign.findUnique.mockResolvedValue(makeCampaign());
      const logSpy = jest
        .spyOn((service as any).logger, 'log')
        .mockImplementation();

      await service.findOne('camp-1');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('anonymous=true'),
      );
      logSpy.mockRestore();
    });

    it('does not log when the campaign lookup ends in a 404', async () => {
      prisma.campaign.findUnique.mockResolvedValue(null);
      const logSpy = jest
        .spyOn((service as any).logger, 'log')
        .mockImplementation();

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );

      expect(logSpy).not.toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('returns DRAFT campaign to its brand owner', async () => {
      prisma.campaign.findUnique.mockResolvedValue(
        makeCampaign({ status: CampaignStatus.DRAFT }),
      );
      prisma.brand.count.mockResolvedValue(1); // is owner

      const result = await service.findOne('camp-1', 'user-1');

      expect(result.status).toBe(CampaignStatus.DRAFT);
    });

    it('throws 404 for DRAFT campaign to non-owner — does not leak existence', async () => {
      prisma.campaign.findUnique.mockResolvedValue(
        makeCampaign({ status: CampaignStatus.DRAFT }),
      );
      prisma.brand.count.mockResolvedValue(0);

      await expect(service.findOne('camp-1', 'other-user')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws 404 for DRAFT campaign to unauthenticated viewer', async () => {
      prisma.campaign.findUnique.mockResolvedValue(
        makeCampaign({ status: CampaignStatus.DRAFT }),
      );

      await expect(service.findOne('camp-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws 404 for CLOSED campaign to non-owner', async () => {
      prisma.campaign.findUnique.mockResolvedValue(
        makeCampaign({ status: CampaignStatus.CLOSED }),
      );
      prisma.brand.count.mockResolvedValue(0);

      await expect(service.findOne('camp-1', 'other-user')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws 404 when campaign does not exist', async () => {
      prisma.campaign.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── publish ──────────────────────────────────────────────────────────────────

  describe('publish', () => {
    it('transitions DRAFT → ACTIVE', async () => {
      prisma.campaign.findUnique.mockResolvedValue(
        makeCampaign({
          status: CampaignStatus.DRAFT,
          brand: makeBrand({ userId: 'user-1' }),
        }),
      );
      prisma.campaign.update.mockResolvedValue(
        makeCampaign({ status: CampaignStatus.ACTIVE }),
      );

      const result = await service.publish('camp-1', 'user-1');

      expect(prisma.campaign.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: CampaignStatus.ACTIVE } }),
      );
      expect(result.status).toBe(CampaignStatus.ACTIVE);
    });

    it('throws BadRequestException when campaign is already ACTIVE', async () => {
      prisma.campaign.findUnique.mockResolvedValue(
        makeCampaign({
          status: CampaignStatus.ACTIVE,
          brand: makeBrand({ userId: 'user-1' }),
        }),
      );

      await expect(service.publish('camp-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws ForbiddenException when user does not own the campaign', async () => {
      prisma.campaign.findUnique.mockResolvedValue(
        makeCampaign({
          status: CampaignStatus.DRAFT,
          brand: makeBrand({ userId: 'owner' }),
        }),
      );

      await expect(service.publish('camp-1', 'attacker')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ─── findMine ─────────────────────────────────────────────────────────────────

  describe('findMine', () => {
    it('returns only campaigns owned by the brand, each with approvedCount and pendingCount', async () => {
      prisma.brand.findUnique.mockResolvedValue(makeBrand());
      prisma.campaign.findMany.mockResolvedValue([
        makeCampaign(),
        makeCampaign({ id: 'camp-2' }),
      ]);
      prisma.application.groupBy.mockResolvedValue([
        { campaignId: 'camp-1', status: 'APPROVED', _count: { _all: 3 } },
        { campaignId: 'camp-1', status: 'PENDING', _count: { _all: 6 } },
      ]);

      const result = await service.findMine('user-1');

      expect(result).toHaveLength(2);
      expect(result[0].approvedCount).toBe(3);
      expect(result[0].pendingCount).toBe(6);
      // camp-2 sem entrada no groupBy — nenhuma candidatura ainda, não some da lista
      expect(result[1].approvedCount).toBe(0);
      expect(result[1].pendingCount).toBe(0);
    });

    it('throws ForbiddenException when user has no brand profile', async () => {
      prisma.brand.findUnique.mockResolvedValue(null);

      await expect(service.findMine('user-without-brand')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
