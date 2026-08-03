/**
 * Race condition tests — CreatorsService
 *
 * findOrCreateInfluencer() faz findUnique + create sem atomicidade total. Sob
 * concorrência, um request pode criar o mesmo igHandle/email entre o nosso check
 * e o create → o Postgres rejeita com P2002. O fix captura o P2002 e reusa o
 * registro que o request concorrente criou (findExistingInfluencer), em vez de
 * vazar um 500.
 *
 *   RC-1: colisão concorrente em igHandle → re-fetch por handle e reusa.
 *   RC-2: colisão concorrente em email   → re-fetch por email e reusa.
 */
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApplicationStatus,
  CampaignStatus,
  IgFetchStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { CreatorsService } from './creators.service';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { InstagramSyncService } from '../../instagram/instagram-sync.service';
import { EmailService } from '../../email/email.service';
import { QueryCounter } from '../../../shared/infrastructure/database/query-counter';

const makeActiveCampaign = () => ({
  id: 'camp-1',
  status: CampaignStatus.ACTIVE,
});

const makeInfluencer = (overrides: Record<string, unknown> = {}) => ({
  id: 'inf-1',
  instagramHandle: '@creator',
  userId: 'user-1',
  igFetchStatus: IgFetchStatus.PENDING,
  ...overrides,
});

const makeUser = (overrides: Record<string, unknown> = {}) => ({
  id: 'user-1',
  email: 'creator@example.com',
  role: UserRole.INFLUENCER,
  influencer: makeInfluencer(),
  ...overrides,
});

const applyDto = {
  igHandle: '@creator',
  email: 'creator@example.com',
  name: 'Creator',
  message: 'quero participar',
};

describe('CreatorsService — race conditions', () => {
  let service: CreatorsService;
  let prisma: jest.Mocked<any>;
  const counter = new QueryCounter();

  beforeEach(async () => {
    prisma = {
      campaign: { findUnique: jest.fn() },
      influencer: { findUnique: jest.fn(), update: jest.fn() },
      user: { findUnique: jest.fn(), create: jest.fn() },
      application: { create: jest.fn() },
    };

    counter.wrap(prisma);

    const instagramSync = { refresh: jest.fn().mockResolvedValue(undefined) };
    const emailService = {
      sendClaimAccount: jest.fn().mockResolvedValue(undefined),
    };
    const config = {
      getOrThrow: jest.fn().mockReturnValue('http://localhost:5173'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreatorsService,
        { provide: PrismaService, useValue: prisma },
        { provide: InstagramSyncService, useValue: instagramSync },
        { provide: EmailService, useValue: emailService },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get(CreatorsService);
  });

  afterEach(() => counter.reset());

  // ─── RC-1: igHandle duplicado sob concorrência ────────────────────────────────

  describe('applyPublic() — RC-1: igHandle duplicado sob concorrência', () => {
    // GREEN após o fix: quando um request concorrente cria o mesmo igHandle
    // entre nossos findUnique e o create, o Postgres rejeita com P2002. O fix
    // captura o P2002 e reusa o influencer recém-criado (findExistingInfluencer
    // → busca por handle), em vez de vazar um 500.
    it('reusa o influencer existente quando user.create colide em igHandle (P2002 tratado, sem 500)', async () => {
      prisma.campaign.findUnique.mockResolvedValue(makeActiveCampaign());

      // 1ª chamada (check inicial): handle não existe → null.
      // 2ª chamada (re-fetch após P2002): o concorrente já criou → retorna.
      prisma.influencer.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValue(makeInfluencer());
      prisma.user.findUnique.mockResolvedValue(null);

      // O create perde a corrida e colide na constraint de instagramHandle.
      prisma.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '6.0.0',
          meta: { target: ['instagramHandle'] },
        }),
      );

      prisma.application.create.mockResolvedValue({
        id: 'app-1',
        status: ApplicationStatus.PENDING,
      });

      const result = await service.applyPublic('camp-1', applyDto);

      // Sem 500: a candidatura é concluída reusando o influencer existente.
      expect(result).toHaveProperty('applicationId');
      expect(result.status).toBe(ApplicationStatus.PENDING);
    });

    it('retorna o influencer existente quando igHandle já existe (path feliz)', async () => {
      prisma.campaign.findUnique.mockResolvedValue(makeActiveCampaign());
      prisma.influencer.findUnique.mockResolvedValue(makeInfluencer());
      prisma.application.create.mockResolvedValue({
        id: 'app-1',
        status: ApplicationStatus.PENDING,
      });

      const result = await service.applyPublic('camp-1', applyDto);

      expect(result).toHaveProperty('applicationId');
      // Não deve ter criado novo user/influencer
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('não emite mais de 4 queries para um apply público (sem N+1)', async () => {
      // influencer.findUnique (1) + application.create (1) = 2 queries mínimas
      // quando o influencer já existe. Com criação: +3 (user.findUnique, user.create) = máx 5
      prisma.campaign.findUnique.mockResolvedValue(makeActiveCampaign());
      prisma.influencer.findUnique.mockResolvedValue(makeInfluencer());
      prisma.application.create.mockResolvedValue({
        id: 'app-1',
        status: ApplicationStatus.PENDING,
      });

      await service.applyPublic('camp-1', applyDto);

      counter.assertAtMost('campaign', 'findUnique', 1, 'applyPublic');
      counter.assertAtMost('influencer', 'findUnique', 1, 'applyPublic');
      counter.assertAtMost('application', 'create', 1, 'applyPublic');
    });
  });

  // ─── RC-2: email duplicado sob concorrência ───────────────────────────────────

  describe('applyPublic() — RC-2: email duplicado sob concorrência', () => {
    // GREEN após o fix: colisão concorrente na constraint de email. O re-fetch
    // não acha por handle (continua null), mas acha o user pelo email e reusa
    // o influencer dele — sem vazar 500.
    it('reusa o influencer existente quando user.create colide em email (P2002 tratado, sem 500)', async () => {
      prisma.campaign.findUnique.mockResolvedValue(makeActiveCampaign());
      prisma.influencer.findUnique.mockResolvedValue(null); // handle nunca existe

      // 1ª chamada (fluxo principal): email não existe → null.
      // 2ª chamada (re-fetch após P2002): concorrente já criou o user → retorna.
      prisma.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValue(makeUser());

      prisma.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '6.0.0',
          meta: { target: ['email'] },
        }),
      );

      prisma.application.create.mockResolvedValue({
        id: 'app-1',
        status: ApplicationStatus.PENDING,
      });

      const result = await service.applyPublic('camp-1', applyDto);

      expect(result).toHaveProperty('applicationId');
      expect(result.status).toBe(ApplicationStatus.PENDING);
    });
  });

  // ─── Validações sequenciais (devem funcionar independente do fix) ─────────────

  describe('applyPublic() — validações (sem concorrência)', () => {
    it('lança NotFoundException quando a campanha não existe', async () => {
      prisma.campaign.findUnique.mockResolvedValue(null);

      await expect(
        service.applyPublic('camp-inexistente', applyDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('lança BadRequestException quando a campanha não está ativa', async () => {
      prisma.campaign.findUnique.mockResolvedValue({
        id: 'camp-1',
        status: CampaignStatus.CLOSED,
      });

      await expect(service.applyPublic('camp-1', applyDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lança ConflictException quando o email pertence a uma marca', async () => {
      prisma.campaign.findUnique.mockResolvedValue(makeActiveCampaign());
      prisma.influencer.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-brand',
        role: UserRole.BRAND,
      });

      await expect(service.applyPublic('camp-1', applyDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('lança ConflictException quando o influencer já se candidatou', async () => {
      prisma.campaign.findUnique.mockResolvedValue(makeActiveCampaign());
      prisma.influencer.findUnique.mockResolvedValue(makeInfluencer());
      prisma.application.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint', {
          code: 'P2002',
          clientVersion: '6.0.0',
          meta: {},
        }),
      );

      await expect(service.applyPublic('camp-1', applyDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // ─── getPublicProfile() — N+1 guard ──────────────────────────────────────────

  describe('getPublicProfile()', () => {
    it('carrega perfil e parcerias em uma única query (sem N+1)', async () => {
      prisma.influencer.findUnique.mockResolvedValue({
        ...makeInfluencer(),
        publicProfileEnabled: true,
        followersCount: 10000,
        igEngagementRate: 4.5,
        igRecentPosts: [],
        bio: '',
        niches: [],
        city: null,
        avatarUrl: null,
        applications: [
          {
            result: null,
            submissions: [],
          },
        ],
      });

      await service.getPublicProfile('@creator');

      // Deve ser exatamente 1 query — sem queries adicionais por parceria
      counter.assertAtMost('influencer', 'findUnique', 1, 'getPublicProfile');
      expect(counter.callCount('application', 'findMany')).toBe(0); // carrega via include
    });
  });
});
