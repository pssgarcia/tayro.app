import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { BrandsService } from './brands.service';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';

const makeBrand = (o: Partial<Record<string, unknown>> = {}) => ({
  id: 'brand-1',
  name: 'Marca Fit',
  logoUrl: null,
  niches: ['fitness'],
  website: 'https://marca.com',
  bio: null,
  createdAt: new Date('2026-06-01'),
  user: { email: 'marca@exemplo.com' },
  ...o,
});

describe('BrandsService — exportMyData (LGPD)', () => {
  let service: BrandsService;
  let prisma: jest.Mocked<any>;

  beforeEach(async () => {
    prisma = {
      brand: { findUnique: jest.fn() },
      campaign: { findMany: jest.fn().mockResolvedValue([]) },
      reward: { findMany: jest.fn().mockResolvedValue([]) },
      partnershipResult: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [BrandsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(BrandsService);
  });

  it('lança ForbiddenException quando o usuário não tem marca', async () => {
    prisma.brand.findUnique.mockResolvedValue(null);

    await expect(service.exportMyData('user-1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('devolve o e-mail achatado e o que a marca registrou', async () => {
    prisma.brand.findUnique.mockResolvedValue(makeBrand());

    const result = await service.exportMyData('user-1');

    expect(result.profile.email).toBe('marca@exemplo.com');
    expect(result.profile.name).toBe('Marca Fit');
    expect(result).toHaveProperty('exportedAt');
    expect(result.campaigns).toEqual([]);
    expect(result.rewardsIssued).toEqual([]);
    expect(result.partnershipResults).toEqual([]);
  });

  it('o select do perfil só alcança e-mail e o registro de aceite no user', async () => {
    prisma.brand.findUnique.mockResolvedValue(makeBrand());

    await service.exportMyData('user-1');

    const select = prisma.brand.findUnique.mock.calls[0][0].select as Record<
      string,
      unknown
    >;
    // Lista exata (não `objectContaining`): é justamente o campo NOVO que não
    // deveria estar aqui que precisa fazer o teste falhar.
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
  });

  it('campanhas trazem só a contagem de candidaturas, não o dado de cada creator', async () => {
    prisma.brand.findUnique.mockResolvedValue(makeBrand());

    await service.exportMyData('user-1');

    const select = prisma.campaign.findMany.mock.calls[0][0].select as Record<
      string,
      unknown
    >;
    expect(select._count).toEqual({ select: { applications: true } });
    expect(select).not.toHaveProperty('applications');
  });

  it('busca campanhas/recompensas/resultados de parceria filtrados pela marca', async () => {
    prisma.brand.findUnique.mockResolvedValue(makeBrand());

    await service.exportMyData('user-1');

    expect(prisma.campaign.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { brandId: 'brand-1' } }),
    );
    expect(prisma.reward.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { campaign: { brandId: 'brand-1' } } }),
    );
    expect(prisma.partnershipResult.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { application: { campaign: { brandId: 'brand-1' } } },
      }),
    );
  });
});
