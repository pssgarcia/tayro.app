import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { RewardStatus } from '@prisma/client';
import { RewardsService } from './rewards.service';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';

const makeBrand = (o: Partial<Record<string, unknown>> = {}) => ({
  id: 'brand-1',
  userId: 'user-brand-1',
  ...o,
});

const makeCampaign = (o: Partial<Record<string, unknown>> = {}) => ({
  id: 'camp-1',
  brandId: 'brand-1',
  ...o,
});

const makeReward = (o: Partial<Record<string, unknown>> = {}) => ({
  id: 'rew-1',
  status: RewardStatus.PENDING,
  campaign: makeCampaign(),
  ...o,
});

describe('RewardsService', () => {
  let service: RewardsService;
  let prisma: jest.Mocked<any>;

  beforeEach(async () => {
    prisma = {
      brand: { findUnique: jest.fn() },
      campaign: { findUnique: jest.fn() },
      application: { findFirst: jest.fn() },
      reward: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      influencer: { findUnique: jest.fn() },
      contentSubmission: {},
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [RewardsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(RewardsService);
  });

  // ─── create ───────────────────────────────────────────────────────────────────

  describe('create', () => {
    const dto = {
      influencerId: 'inf-1',
      campaignId: 'camp-1',
      type: 'MONETARY' as const,
      value: 'R$300,00',
    };

    it('cria recompensa quando influencer tem application aprovada', async () => {
      prisma.brand.findUnique.mockResolvedValue(makeBrand());
      prisma.campaign.findUnique.mockResolvedValue(makeCampaign());
      prisma.application.findFirst.mockResolvedValue({ id: 'app-1' });
      prisma.reward.create.mockResolvedValue({ id: 'rew-1', ...dto });

      const result = await service.create('user-brand-1', dto);

      expect(result.id).toBe('rew-1');
      expect(prisma.reward.create).toHaveBeenCalledTimes(1);
    });

    it('lança BadRequestException quando influencer não tem application aprovada', async () => {
      prisma.brand.findUnique.mockResolvedValue(makeBrand());
      prisma.campaign.findUnique.mockResolvedValue(makeCampaign());
      prisma.application.findFirst.mockResolvedValue(null);

      await expect(service.create('user-brand-1', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lança ForbiddenException quando brand não é dona da campanha', async () => {
      prisma.brand.findUnique.mockResolvedValue(
        makeBrand({ id: 'brand-outro' }),
      );
      prisma.campaign.findUnique.mockResolvedValue(
        makeCampaign({ brandId: 'brand-1' }),
      );

      await expect(service.create('user-brand-1', dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('lança NotFoundException quando campanha não existe', async () => {
      prisma.brand.findUnique.mockResolvedValue(makeBrand());
      prisma.campaign.findUnique.mockResolvedValue(null);

      await expect(service.create('user-brand-1', dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── remove ───────────────────────────────────────────────────────────────────
  // Existe porque múltiplas recompensas por creator/campanha são legítimas
  // (dinheiro + produto): nada no dado impede um registro duplicado por engano.
  // A partir de ISSUED não apaga — já foi anunciado à creator.

  describe('remove', () => {
    it('apaga a recompensa quando ainda está PENDING', async () => {
      prisma.brand.findUnique.mockResolvedValue(makeBrand());
      prisma.reward.findUnique.mockResolvedValue(makeReward());
      prisma.reward.delete.mockResolvedValue(undefined);

      await service.remove('rew-1', 'user-brand-1');

      expect(prisma.reward.delete).toHaveBeenCalledWith({
        where: { id: 'rew-1' },
      });
    });

    it.each([RewardStatus.ISSUED, RewardStatus.DELIVERED])(
      'recusa apagar recompensa em %s — nada é apagado',
      async (status) => {
        prisma.brand.findUnique.mockResolvedValue(makeBrand());
        prisma.reward.findUnique.mockResolvedValue(makeReward({ status }));

        await expect(service.remove('rew-1', 'user-brand-1')).rejects.toThrow(
          BadRequestException,
        );
        expect(prisma.reward.delete).not.toHaveBeenCalled();
      },
    );

    it('403 ao apagar recompensa de campanha de outra marca — nada é apagado', async () => {
      prisma.brand.findUnique.mockResolvedValue(makeBrand({ id: 'brand-2' }));
      prisma.reward.findUnique.mockResolvedValue(makeReward());

      await expect(service.remove('rew-1', 'user-brand-2')).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.reward.delete).not.toHaveBeenCalled();
    });

    it('404 quando a recompensa não existe', async () => {
      prisma.brand.findUnique.mockResolvedValue(makeBrand());
      prisma.reward.findUnique.mockResolvedValue(null);

      await expect(service.remove('ghost', 'user-brand-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── markAsIssued ─────────────────────────────────────────────────────────────

  describe('markAsIssued', () => {
    it('atualiza status para ISSUED quando estava PENDING', async () => {
      prisma.brand.findUnique.mockResolvedValue(makeBrand());
      prisma.reward.findUnique.mockResolvedValue(makeReward());
      prisma.reward.update.mockResolvedValue({
        ...makeReward(),
        status: RewardStatus.ISSUED,
      });

      const result = await service.markAsIssued('rew-1', 'user-brand-1');

      expect(result.status).toBe(RewardStatus.ISSUED);
    });

    it('lança BadRequestException quando reward já está ISSUED', async () => {
      prisma.brand.findUnique.mockResolvedValue(makeBrand());
      prisma.reward.findUnique.mockResolvedValue(
        makeReward({ status: RewardStatus.ISSUED }),
      );

      await expect(
        service.markAsIssued('rew-1', 'user-brand-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── markAsDelivered ──────────────────────────────────────────────────────────

  describe('markAsDelivered', () => {
    it('atualiza status para DELIVERED quando estava ISSUED', async () => {
      prisma.brand.findUnique.mockResolvedValue(makeBrand());
      prisma.reward.findUnique.mockResolvedValue(
        makeReward({ status: RewardStatus.ISSUED }),
      );
      prisma.reward.update.mockResolvedValue({
        ...makeReward(),
        status: RewardStatus.DELIVERED,
      });

      const result = await service.markAsDelivered('rew-1', 'user-brand-1');

      expect(result.status).toBe(RewardStatus.DELIVERED);
    });

    it('lança BadRequestException quando reward está PENDING (precisa ser ISSUED primeiro)', async () => {
      prisma.brand.findUnique.mockResolvedValue(makeBrand());
      prisma.reward.findUnique.mockResolvedValue(
        makeReward({ status: RewardStatus.PENDING }),
      );

      await expect(
        service.markAsDelivered('rew-1', 'user-brand-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
