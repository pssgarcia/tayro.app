import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreatorsService } from './creators.service';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { InstagramSyncService } from '../../instagram/instagram-sync.service';

const makeInfluencer = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'inf-1',
  name: 'Ana Silva',
  avatarUrl: null,
  bio: null,
  city: null,
  niches: ['fitness'],
  instagramHandle: 'anafit',
  tiktokHandle: null,
  followersCount: 1000,
  igEngagementRate: 4.2,
  igFetchStatus: 'OK',
  publicProfileEnabled: false,
  createdAt: new Date('2026-01-01'),
  user: { email: 'ana@example.com' },
  ...overrides,
});

describe('CreatorsService — perfil (me)', () => {
  let service: CreatorsService;
  let prisma: jest.Mocked<any>;

  beforeEach(async () => {
    prisma = {
      influencer: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreatorsService,
        { provide: PrismaService, useValue: prisma },
        { provide: InstagramSyncService, useValue: { refresh: jest.fn() } },
      ],
    }).compile();

    service = module.get(CreatorsService);
  });

  // ─── getMe ──────────────────────────────────────────────────────────────────

  it('getMe achata o email e retorna o perfil', async () => {
    prisma.influencer.findUnique.mockResolvedValue(makeInfluencer());

    const result = await service.getMe('user-1');

    expect(result.email).toBe('ana@example.com');
    expect(result.instagramHandle).toBe('anafit');
    expect(result).not.toHaveProperty('user');
  });

  it('getMe lança Forbidden quando o usuário não tem perfil de influencer', async () => {
    prisma.influencer.findUnique.mockResolvedValue(null);

    await expect(service.getMe('user-sem-perfil')).rejects.toThrow(
      ForbiddenException,
    );
  });

  // ─── updateMe ───────────────────────────────────────────────────────────────

  it('updateMe envia só os campos presentes (partial) e persiste o toggle LGPD', async () => {
    prisma.influencer.update.mockResolvedValue(makeInfluencer());
    prisma.influencer.findUnique.mockResolvedValue(
      makeInfluencer({ publicProfileEnabled: true, bio: 'Nova bio' }),
    );

    const result = await service.updateMe('user-1', {
      bio: 'Nova bio',
      publicProfileEnabled: true,
    });

    expect(prisma.influencer.update).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: { bio: 'Nova bio', publicProfileEnabled: true },
    });
    // não inclui campos não enviados
    expect(prisma.influencer.update.mock.calls[0][0].data).not.toHaveProperty(
      'name',
    );
    expect(result.publicProfileEnabled).toBe(true);
  });

  it('updateMe traduz P2025 (registro inexistente) em Forbidden', async () => {
    prisma.influencer.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '6.19.3',
      }),
    );

    await expect(
      service.updateMe('user-sem-perfil', { name: 'X' }),
    ).rejects.toThrow(ForbiddenException);
  });
});
