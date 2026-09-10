import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreatorsService } from './creators.service';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { InstagramSyncService } from '../../instagram/instagram-sync.service';
import { EmailService } from '../../email/email.service';

const makeInfluencer = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'inf-1',
  name: 'Ana Silva',
  avatarUrl: null,
  bio: null,
  phone: '(11) 91234-5678',
  instagramHandle: 'anafit',
  tiktokHandle: null,
  followersCount: 1000,
  niches: ['fitness'],
  city: 'Belo Horizonte',
  igEngagementRate: 4.2,
  igRecentPosts: [
    { url: 'https://x', thumbnail: 'https://y', likes: 1, comments: 1 },
  ],
  igProfilePicUrl: 'https://cdn.instagram.com/foto.jpg',
  igFetchedAt: new Date('2026-09-01'),
  igFetchStatus: 'OK',
  publicProfileEnabled: false,
  createdAt: new Date('2026-01-01'),
  user: { email: 'ana@example.com' },
  ...overrides,
});

describe('CreatorsService — exportMyData (LGPD)', () => {
  let service: CreatorsService;
  let prisma: jest.Mocked<any>;

  beforeEach(async () => {
    prisma = {
      influencer: { findUnique: jest.fn() },
      application: { findMany: jest.fn().mockResolvedValue([]) },
      reward: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreatorsService,
        { provide: PrismaService, useValue: prisma },
        { provide: InstagramSyncService, useValue: { refresh: jest.fn() } },
        { provide: EmailService, useValue: {} },
        { provide: ConfigService, useValue: { getOrThrow: jest.fn() } },
      ],
    }).compile();

    service = module.get(CreatorsService);
  });

  it('lança Forbidden quando o usuário não tem perfil de influencer', async () => {
    prisma.influencer.findUnique.mockResolvedValue(null);

    await expect(service.exportMyData('user-sem-perfil')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('devolve o e-mail achatado e os dados fornecidos pela creator', async () => {
    prisma.influencer.findUnique.mockResolvedValue(makeInfluencer());

    const result = await service.exportMyData('user-1');

    expect(result.profile.email).toBe('ana@example.com');
    expect(result.profile.instagramHandle).toBe('anafit');
    expect(result.profile.phone).toBe('(11) 91234-5678');
    expect(result).toHaveProperty('exportedAt');
    expect(result.applications).toEqual([]);
    expect(result.rewards).toEqual([]);
  });

  // O mock do Prisma devolve o objeto inteiro ignorando o `select` — um teste
  // que só olha o retorno passaria mesmo com o campo sensível vazando de
  // verdade. A asserção certa é sobre os ARGUMENTOS da consulta (mesmo padrão
  // de `ig-image-not-in-listings.spec.ts` e `creators.service.me.spec.ts`).
  it('o select nunca alcança password/refreshTokenHash/claimTokenHash/resetTokenHash', async () => {
    prisma.influencer.findUnique.mockResolvedValue(makeInfluencer());

    await service.exportMyData('user-1');

    const select = prisma.influencer.findUnique.mock.calls[0][0]
      .select as Record<string, unknown>;
    // Lista exata do que é alcançável no `user`: e-mail e o registro de
    // aceite dos documentos (que é dado sobre a conta e entra na exportação).
    expect(select.user).toEqual({
      select: {
        email: true,
        acceptedTermsVersion: true,
        acceptedPrivacyVersion: true,
        acceptedAt: true,
        declaredAdultAt: true,
      },
    });
    const userSelect = (select.user as { select: Record<string, unknown> })
      .select;
    for (const forbidden of [
      'password',
      'refreshTokenHash',
      'claimTokenHash',
      'claimTokenExpiresAt',
      'resetTokenHash',
      'resetTokenExpiresAt',
    ]) {
      expect(userSelect).not.toHaveProperty(forbidden);
    }
    expect(Object.keys(select)).not.toContain('password');
    expect(Object.keys(select)).not.toContain('refreshTokenHash');
    expect(Object.keys(select)).not.toContain('claimTokenHash');
    expect(Object.keys(select)).not.toContain('resetTokenHash');
    // IgImage (bytes) não é sequer uma relação alcançável por este select —
    // não existe chave `igImages` pedida.
    expect(Object.keys(select)).not.toContain('igImages');
  });

  it('busca applications e rewards filtrados pelo id do influencer', async () => {
    prisma.influencer.findUnique.mockResolvedValue(makeInfluencer());

    await service.exportMyData('user-1');

    expect(prisma.application.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { influencerId: 'inf-1' } }),
    );
    expect(prisma.reward.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { influencerId: 'inf-1' } }),
    );
  });
});
