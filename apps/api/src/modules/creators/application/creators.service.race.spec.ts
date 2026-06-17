/**
 * Race condition tests — CreatorsService
 *
 * Estes testes são RED (falham) intencionalmente com o código atual.
 * O método findOrCreateInfluencer() executa múltiplos findUnique + create sem
 * transação, abrindo três janelas de race condition:
 *
 *   RC-1: Dois formulários com o mesmo igHandle → dois influencers criados
 *         (viola unique constraint; o banco rejeita com P2002, mas o erro não é
 *         tratado corretamente no fluxo de apply)
 *
 *   RC-2: Dois formulários com o mesmo email → dois users criados
 *         (mesma janela, mesmo efeito)
 *
 *   RC-3: Update de instagramHandle sem transação → sobrescrita silenciosa
 *
 * Fix esperado: envolver findOrCreateInfluencer em prisma.$transaction() com
 * isolamento adequado, ou usar upsert atômico.
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
import { CreatorsService } from './creators.service';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { InstagramSyncService } from '../../instagram/instagram-sync.service';
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreatorsService,
        { provide: PrismaService, useValue: prisma },
        { provide: InstagramSyncService, useValue: instagramSync },
      ],
    }).compile();

    service = module.get(CreatorsService);
  });

  afterEach(() => counter.reset());

  // ─── RC-1: igHandle duplicado sob concorrência ────────────────────────────────

  describe('applyPublic() — RC-1: igHandle duplicado sob concorrência', () => {
    it('não cria dois influencers com o mesmo igHandle em requests concorrentes', async () => {
      // Ambas as chamadas concorrentes:
      //   1. Vêem influencer.findUnique → null (não existe ainda)
      //   2. Vêem user.findUnique → null (email novo)
      //   3. Ambas prosseguem para user.create → tentam criar o mesmo registro
      //
      // Comportamento ATUAL (bug): P2002 (unique) na segunda chamada não é tratado
      // no contexto de findOrCreateInfluencer, causando 500 para um dos usuários.
      //
      // Fix esperado: usar prisma.$transaction() com upsert ou tratar P2002 de
      // instagramHandle como "já existe, retorne o existente".

      prisma.campaign.findUnique.mockResolvedValue(makeActiveCampaign());

      // Ambas as chamadas vêem null no snapshot (janela de race)
      prisma.influencer.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue(null);

      let createCount = 0;
      prisma.user.create.mockImplementation(() => {
        createCount++;
        if (createCount === 2) {
          // Simula o banco rejeitando a segunda criação por unique constraint
          throw new Prisma.PrismaClientKnownRequestError(
            'Unique constraint failed',
            { code: 'P2002', clientVersion: '6.0.0', meta: {} },
          );
        }
        return Promise.resolve(makeUser());
      });

      prisma.application.create.mockResolvedValue({
        id: 'app-1',
        status: ApplicationStatus.PENDING,
      });

      const results = await Promise.allSettled([
        service.applyPublic('camp-1', applyDto),
        service.applyPublic('camp-1', applyDto),
      ]);

      const failures = results.filter((r) => r.status === 'rejected');

      // TODO: após fix com transação/upsert, ambas as chamadas devem terminar
      // com sucesso (a segunda reutiliza o influencer já criado) OU a segunda
      // lança ConflictException com mensagem amigável. Em NENHUM caso um 500.
      //
      // Comportamento ATUAL: a segunda chamada lança um P2002 não tratado (500).
      // O teste documenta que deve ser 0 failures após o fix.
      expect(failures.length).toBe(0); // falha atualmente — P2002 escapa como 500
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
    it('não tenta criar dois users com o mesmo email em requests concorrentes', async () => {
      // Caso: igHandle diferente (não cai no return rápido), mas email é o mesmo.
      // Ambas as chamadas vêem user.findUnique → null e prosseguem para create.
      prisma.campaign.findUnique.mockResolvedValue(makeActiveCampaign());
      prisma.influencer.findUnique.mockResolvedValue(null); // igHandle não existe
      prisma.user.findUnique.mockResolvedValue(null); // email não existe (snapshot)

      let createAttempts = 0;
      prisma.user.create.mockImplementation(() => {
        createAttempts++;
        if (createAttempts === 2) {
          throw new Prisma.PrismaClientKnownRequestError('Unique constraint', {
            code: 'P2002',
            clientVersion: '6.0.0',
            meta: {},
          });
        }
        return Promise.resolve(makeUser());
      });

      prisma.application.create.mockResolvedValue({
        id: 'app-1',
        status: ApplicationStatus.PENDING,
      });

      const results = await Promise.allSettled([
        service.applyPublic('camp-1', applyDto),
        service.applyPublic('camp-1', applyDto),
      ]);

      const failures = results.filter((r) => r.status === 'rejected');

      // TODO: após fix, failures.length deve ser 0 (segunda chamada reutiliza user).
      // Comportamento ATUAL (bug): a segunda lança P2002 não tratado (500).
      expect(failures.length).toBe(0); // falha atualmente
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
        status: CampaignStatus.PAUSED,
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
