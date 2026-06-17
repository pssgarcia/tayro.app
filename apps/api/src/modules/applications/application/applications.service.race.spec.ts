/**
 * Race condition tests — ApplicationsService
 *
 * Estes testes são RED (falham) intencionalmente com o código atual.
 * Ficam GREEN após o fix com prisma.$transaction() (ver TODO em cada caso).
 *
 * Por que simulamos com Promise.all + mocks estáticos?
 *   No Node.js, duas requisições concorrentes interleavam entre awaits.
 *   O mock retorna sempre o mesmo "snapshot" do banco — exatamente o que
 *   acontece quando Request B lê o count ANTES de Request A commitar.
 *   Isso reproduz a janela de race condition sem precisar de DB real.
 */
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApplicationStatus, CampaignStatus, Prisma } from '@prisma/client';
import { ApplicationsService } from './applications.service';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { InstagramSyncService } from '../../instagram/instagram-sync.service';
import { QueryCounter } from '../../../shared/infrastructure/database/query-counter';

const makeInfluencer = (id = 'inf-1') => ({ id, userId: 'user-1' });

const makeCampaign = (overrides: Record<string, unknown> = {}) => ({
  id: 'camp-1',
  status: CampaignStatus.ACTIVE,
  maxSpots: 1,
  brandId: 'brand-1',
  brand: { userId: 'brand-user-1' },
  _count: { applications: 0 },
  ...overrides,
});

const makeApplication = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  campaignId: 'camp-1',
  influencerId: 'inf-1',
  status: ApplicationStatus.PENDING,
  campaign: {
    maxSpots: 1,
    brand: { userId: 'brand-user-1' },
  },
  ...overrides,
});

describe('ApplicationsService — race conditions', () => {
  let service: ApplicationsService;
  let prisma: jest.Mocked<any>;
  const counter = new QueryCounter();

  beforeEach(async () => {
    prisma = {
      influencer: { findUnique: jest.fn() },
      campaign: { findUnique: jest.fn() },
      application: {
        create: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
    };

    counter.wrap(prisma);

    const instagramSync = { refresh: jest.fn().mockResolvedValue(undefined) };
    const config = { get: jest.fn().mockReturnValue('15') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: InstagramSyncService, useValue: instagramSync },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get(ApplicationsService);
  });

  afterEach(() => counter.reset());

  // ─── create() ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('não permite mais aplicações que maxSpots sob requisições concorrentes', async () => {
      // Ambas as chamadas concorrentes lêem o mesmo snapshot: count=0, maxSpots=1.
      // Sem transação, as duas passam no check e criam uma application cada.
      // Com prisma.$transaction() (isolamento SERIALIZABLE), apenas uma passa.
      prisma.influencer.findUnique
        .mockResolvedValueOnce(makeInfluencer('inf-1'))
        .mockResolvedValueOnce(makeInfluencer('inf-2'));

      prisma.campaign.findUnique.mockResolvedValue(
        makeCampaign({ _count: { applications: 0 } }),
      );

      let created = 0;
      prisma.application.create.mockImplementation(async () => {
        created++;
        return { id: `app-${created}`, status: ApplicationStatus.PENDING };
      });

      const dto = { campaignId: 'camp-1', message: 'oi' };

      const results = await Promise.allSettled([
        service.create('user-1', dto),
        service.create('user-2', dto),
      ]);

      const successes = results.filter((r) => r.status === 'fulfilled').length;

      // RED até o fix com prisma.$transaction(isolationLevel: Serializable).
      // Com o fix, a segunda transação lê o count atualizado e lança BadRequestException.
      expect(successes).toBe(1);
      expect(created).toBe(1);
    });

    it('rejeita corretamente quando a campanha já está cheia (chamada sequencial)', async () => {
      prisma.influencer.findUnique.mockResolvedValue(makeInfluencer());
      prisma.campaign.findUnique.mockResolvedValue(
        makeCampaign({ _count: { applications: 1 } }), // maxSpots=1, já cheio
      );

      await expect(
        service.create('user-1', { campaignId: 'camp-1', message: 'oi' }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.application.create).not.toHaveBeenCalled();
    });

    it('rejeita quando a campanha não está ativa', async () => {
      prisma.influencer.findUnique.mockResolvedValue(makeInfluencer());
      prisma.campaign.findUnique.mockResolvedValue(
        makeCampaign({ status: CampaignStatus.PAUSED }),
      );

      await expect(
        service.create('user-1', { campaignId: 'camp-1', message: 'oi' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('não emite mais de 3 queries para criar uma application (sem N+1)', async () => {
      prisma.influencer.findUnique.mockResolvedValue(makeInfluencer());
      prisma.campaign.findUnique.mockResolvedValue(
        makeCampaign({ _count: { applications: 0 } }),
      );
      prisma.application.create.mockResolvedValue({
        id: 'app-1',
        status: ApplicationStatus.PENDING,
      });

      await service.create('user-1', { campaignId: 'camp-1', message: 'oi' });

      // influencer.findUnique (1) + campaign.findUnique (1) + application.create (1) = 3
      const total =
        counter.callCount('influencer', 'findUnique') +
        counter.callCount('campaign', 'findUnique') +
        counter.callCount('application', 'create');

      expect(total).toBeLessThanOrEqual(3);
    });
  });

  // ─── approve() ───────────────────────────────────────────────────────────────

  describe('approve()', () => {
    it('não aprova mais aplicações que maxSpots sob requisições concorrentes', async () => {
      // Ambas vêem approvedCount=0 antes de qualquer update commitar.
      const app1 = makeApplication('app-1');
      const app2 = makeApplication('app-2');

      prisma.application.findUnique
        .mockResolvedValueOnce(app1)
        .mockResolvedValueOnce(app2);

      // Ambas lêem count=0 (janela de race)
      prisma.application.count.mockResolvedValue(0);

      let approved = 0;
      prisma.application.update.mockImplementation(async () => {
        approved++;
        return { id: `app-${approved}`, status: ApplicationStatus.APPROVED };
      });

      const results = await Promise.allSettled([
        service.approve('app-1', 'brand-user-1'),
        service.approve('app-2', 'brand-user-1'),
      ]);

      const successes = results.filter((r) => r.status === 'fulfilled').length;

      // RED até o fix com prisma.$transaction(isolationLevel: Serializable).
      expect(successes).toBe(1);
      expect(approved).toBe(1);
    });

    it('rejeita aprovação quando campanha já está cheia (sequencial)', async () => {
      prisma.application.findUnique.mockResolvedValue(makeApplication('app-1'));
      prisma.application.count.mockResolvedValue(1); // maxSpots=1, já cheio

      await expect(
        service.approve('app-1', 'brand-user-1'),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.application.update).not.toHaveBeenCalled();
    });

    it('rejeita quando não é dono da campanha', async () => {
      prisma.application.findUnique.mockResolvedValue(makeApplication('app-1'));

      await expect(
        service.approve('app-1', 'outro-user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejeita quando a aplicação não está pendente', async () => {
      prisma.application.findUnique.mockResolvedValue(
        makeApplication('app-1', { status: ApplicationStatus.APPROVED }),
      );
      prisma.application.count.mockResolvedValue(0);

      await expect(
        service.approve('app-1', 'brand-user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('não emite mais de 3 queries para aprovar uma application (sem N+1)', async () => {
      prisma.application.findUnique.mockResolvedValue(makeApplication('app-1'));
      prisma.application.count.mockResolvedValue(0);
      prisma.application.update.mockResolvedValue({
        id: 'app-1',
        status: ApplicationStatus.APPROVED,
      });

      await service.approve('app-1', 'brand-user-1');

      // findUnique (1) + count (1) + update (1) = 3
      const total =
        counter.callCount('application', 'findUnique') +
        counter.callCount('application', 'count') +
        counter.callCount('application', 'update');

      expect(total).toBeLessThanOrEqual(3);
    });
  });

  // ─── reject() ────────────────────────────────────────────────────────────────

  describe('reject()', () => {
    it('rejeita quando não é dono da campanha', async () => {
      prisma.application.findUnique.mockResolvedValue(makeApplication('app-1'));

      await expect(
        service.reject('app-1', 'outro-user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejeita quando a aplicação não está pendente', async () => {
      prisma.application.findUnique.mockResolvedValue(
        makeApplication('app-1', { status: ApplicationStatus.WITHDRAWN }),
      );

      await expect(
        service.reject('app-1', 'brand-user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── findByCampaign() — N+1 guard ────────────────────────────────────────────

  describe('findByCampaign()', () => {
    it('não emite queries individuais por aplicação (sem N+1)', async () => {
      prisma.campaign.findUnique.mockResolvedValue(makeCampaign());
      prisma.application.findMany.mockResolvedValue([
        makeApplication('a1'),
        makeApplication('a2'),
        makeApplication('a3'),
      ]);

      await service.findByCampaign('camp-1', 'brand-user-1');

      // Deve ser exatamente 1 query para campaign e 1 para applications — nunca N
      counter.assertAtMost('campaign', 'findUnique', 1, 'findByCampaign');
      counter.assertAtMost('application', 'findMany', 1, 'findByCampaign');

      // Nenhuma query adicional por item da lista
      expect(counter.callCount('influencer', 'findUnique')).toBe(0);
    });
  });
});
