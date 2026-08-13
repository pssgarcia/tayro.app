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

  // ─── update / close / remove ──────────────────────────────────────────────────
  // Os três já existiam no service mas nunca tiveram tela (auditoria 2026-08-13).
  // Antes de expor no frontend, travar as regras de estado aqui: o frontend
  // esconde o botão, mas quem garante a máquina de estados é o backend.

  describe('update', () => {
    it('edits a DRAFT campaign', async () => {
      prisma.campaign.findUnique.mockResolvedValue(
        makeCampaign({
          status: CampaignStatus.DRAFT,
          brand: makeBrand({ userId: 'user-1' }),
        }),
      );
      prisma.campaign.update.mockResolvedValue(
        makeCampaign({ status: CampaignStatus.DRAFT, title: 'Novo título' }),
      );

      const result = await service.update('camp-1', 'user-1', {
        title: 'Novo título',
      });

      expect(prisma.campaign.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'camp-1' },
          data: expect.objectContaining({ title: 'Novo título' }),
        }),
      );
      expect(result.title).toBe('Novo título');
    });

    it('converts deadline string to Date', async () => {
      prisma.campaign.findUnique.mockResolvedValue(
        makeCampaign({
          status: CampaignStatus.DRAFT,
          brand: makeBrand({ userId: 'user-1' }),
        }),
      );
      prisma.campaign.update.mockResolvedValue(makeCampaign());

      await service.update('camp-1', 'user-1', { deadline: '2026-09-30' });

      const { data } = prisma.campaign.update.mock.calls[0][0];
      expect(data.deadline).toBeInstanceOf(Date);
    });

    it('throws BadRequestException when campaign is ACTIVE', async () => {
      prisma.campaign.findUnique.mockResolvedValue(
        makeCampaign({
          status: CampaignStatus.ACTIVE,
          brand: makeBrand({ userId: 'user-1' }),
        }),
      );

      await expect(
        service.update('camp-1', 'user-1', { title: 'x' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.campaign.update).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when user does not own the campaign', async () => {
      prisma.campaign.findUnique.mockResolvedValue(
        makeCampaign({
          status: CampaignStatus.DRAFT,
          brand: makeBrand({ userId: 'owner' }),
        }),
      );

      await expect(
        service.update('camp-1', 'attacker', { title: 'x' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('close', () => {
    it('transitions ACTIVE → CLOSED', async () => {
      prisma.campaign.findUnique.mockResolvedValue(
        makeCampaign({
          status: CampaignStatus.ACTIVE,
          brand: makeBrand({ userId: 'user-1' }),
        }),
      );
      prisma.campaign.update.mockResolvedValue(
        makeCampaign({ status: CampaignStatus.CLOSED }),
      );

      const result = await service.close('camp-1', 'user-1');

      expect(prisma.campaign.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: CampaignStatus.CLOSED } }),
      );
      expect(result.status).toBe(CampaignStatus.CLOSED);
    });

    it('throws BadRequestException when campaign is DRAFT (never published)', async () => {
      prisma.campaign.findUnique.mockResolvedValue(
        makeCampaign({
          status: CampaignStatus.DRAFT,
          brand: makeBrand({ userId: 'user-1' }),
        }),
      );

      await expect(service.close('camp-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when campaign is already CLOSED', async () => {
      prisma.campaign.findUnique.mockResolvedValue(
        makeCampaign({
          status: CampaignStatus.CLOSED,
          brand: makeBrand({ userId: 'user-1' }),
        }),
      );

      await expect(service.close('camp-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws ForbiddenException when user does not own the campaign', async () => {
      prisma.campaign.findUnique.mockResolvedValue(
        makeCampaign({
          status: CampaignStatus.ACTIVE,
          brand: makeBrand({ userId: 'owner' }),
        }),
      );

      await expect(service.close('camp-1', 'attacker')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('remove', () => {
    it('deletes a DRAFT campaign', async () => {
      prisma.campaign.findUnique.mockResolvedValue(
        makeCampaign({
          status: CampaignStatus.DRAFT,
          brand: makeBrand({ userId: 'user-1' }),
        }),
      );
      prisma.campaign.delete.mockResolvedValue(makeCampaign());

      await service.remove('camp-1', 'user-1');

      expect(prisma.campaign.delete).toHaveBeenCalledWith({
        where: { id: 'camp-1' },
      });
    });

    // Guarda o dado das creators: apagar um programa ACTIVE levaria junto as
    // candidaturas por cascade (onDelete: Cascade em Application).
    it('throws BadRequestException when campaign is ACTIVE', async () => {
      prisma.campaign.findUnique.mockResolvedValue(
        makeCampaign({
          status: CampaignStatus.ACTIVE,
          brand: makeBrand({ userId: 'user-1' }),
        }),
      );

      await expect(service.remove('camp-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.campaign.delete).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when user does not own the campaign', async () => {
      prisma.campaign.findUnique.mockResolvedValue(
        makeCampaign({
          status: CampaignStatus.DRAFT,
          brand: makeBrand({ userId: 'owner' }),
        }),
      );

      await expect(service.remove('camp-1', 'attacker')).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.campaign.delete).not.toHaveBeenCalled();
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
