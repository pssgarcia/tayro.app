/**
 * ApplicationsService.findApprovedForBrand — creators aprovadas, cross-campanha
 *
 * Alimenta a página "Creators" da marca (specs/creator-roster). Agrega, por
 * creator, todas as `Application` com status APPROVED entre TODAS as
 * campanhas da marca — uma creator aprovada em duas campanhas aparece uma
 * única vez, com as duas aprovações listadas. Sem N+1: uma única query
 * (`findMany` com `include`), agrupamento em memória depois.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { InstagramSyncService } from '../../instagram/instagram-sync.service';
import { EmailService } from '../../email/email.service';
import { ConfigService } from '@nestjs/config';

describe('ApplicationsService.findApprovedForBrand', () => {
  let service: ApplicationsService;
  let prisma: jest.Mocked<any>;

  const influencerA = { id: 'inf-A', name: 'Ana Fitness' };
  const influencerB = { id: 'inf-B', name: 'Bia Fitness' };

  const appRow = (overrides: Record<string, unknown> = {}) => ({
    id: 'app-1',
    influencerId: influencerA.id,
    reviewedAt: new Date('2026-09-01T10:00:00Z'),
    influencer: influencerA,
    campaign: { id: 'camp-1', title: 'Campanha 1' },
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      brand: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'brand-1', userId: 'user-1' }),
      },
      application: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: InstagramSyncService,
          useValue: { scheduleRefresh: jest.fn() },
        },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: EmailService, useValue: {} },
      ],
    }).compile();

    service = module.get(ApplicationsService);
  });

  it('devolve array vazio quando a marca não tem candidatura aprovada nenhuma', async () => {
    await expect(service.findApprovedForBrand('user-1')).resolves.toEqual([]);
  });

  it('filtra por status APPROVED e pelas campanhas da própria marca', async () => {
    await service.findApprovedForBrand('user-1');

    expect(prisma.application.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'APPROVED',
          campaign: { brandId: 'brand-1' },
        }),
      }),
    );
  });

  it('agrupa duas aprovações da mesma creator num único item', async () => {
    prisma.application.findMany.mockResolvedValue([
      appRow({ id: 'app-1', campaign: { id: 'camp-1', title: 'Campanha 1' } }),
      appRow({ id: 'app-2', campaign: { id: 'camp-2', title: 'Campanha 2' } }),
    ]);

    const result = await service.findApprovedForBrand('user-1');

    expect(result).toHaveLength(1);
    expect(result[0].influencer).toEqual(influencerA);
    expect(result[0].approvals).toHaveLength(2);
    expect(result[0].approvals.map((a: any) => a.campaignId)).toEqual([
      'camp-1',
      'camp-2',
    ]);
  });

  it('mantém creators diferentes como itens separados', async () => {
    prisma.application.findMany.mockResolvedValue([
      appRow({
        id: 'app-1',
        influencerId: influencerA.id,
        influencer: influencerA,
      }),
      appRow({
        id: 'app-2',
        influencerId: influencerB.id,
        influencer: influencerB,
      }),
    ]);

    const result = await service.findApprovedForBrand('user-1');

    expect(result).toHaveLength(2);
    expect(result.map((r: any) => r.influencer.id)).toEqual([
      influencerA.id,
      influencerB.id,
    ]);
  });

  it('preserva a ordenação vinda do banco (aprovação mais recente primeiro)', async () => {
    // orderBy: reviewedAt desc é responsabilidade da query — o service não
    // reordena, só agrupa preservando a ordem de chegada.
    prisma.application.findMany.mockResolvedValue([
      appRow({
        id: 'app-recent',
        influencerId: influencerB.id,
        influencer: influencerB,
      }),
      appRow({
        id: 'app-older',
        influencerId: influencerA.id,
        influencer: influencerA,
      }),
    ]);

    const result = await service.findApprovedForBrand('user-1');

    expect(result.map((r: any) => r.influencer.id)).toEqual([
      influencerB.id,
      influencerA.id,
    ]);
  });

  it('pede a ordenação por reviewedAt desc ao banco', async () => {
    await service.findApprovedForBrand('user-1');

    expect(prisma.application.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { reviewedAt: 'desc' } }),
    );
  });

  it('rejeita com 403 quando o usuário não tem perfil de marca', async () => {
    prisma.brand.findUnique.mockResolvedValue(null);

    await expect(service.findApprovedForBrand('user-1')).rejects.toThrow(
      ForbiddenException,
    );
    expect(prisma.application.findMany).not.toHaveBeenCalled();
  });
});
