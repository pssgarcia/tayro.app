import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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

describe('BrandsService', () => {
  let service: BrandsService;
  let prisma: jest.Mocked<any>;

  beforeEach(async () => {
    prisma = {
      brand: { findUnique: jest.fn(), update: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [BrandsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(BrandsService);
  });

  // ─── getMe ──────────────────────────────────────────────────────────────────

  describe('getMe', () => {
    it('retorna o perfil da marca com email achatado', async () => {
      prisma.brand.findUnique.mockResolvedValue(makeBrand());

      const result = await service.getMe('user-1');

      expect(result).toEqual({
        id: 'brand-1',
        name: 'Marca Fit',
        email: 'marca@exemplo.com',
        logoUrl: null,
        niches: ['fitness'],
        website: 'https://marca.com',
        bio: null,
        createdAt: new Date('2026-06-01'),
      });
      // não vaza o objeto user aninhado
      expect((result as any).user).toBeUndefined();
    });

    it('lança ForbiddenException quando o usuário não tem marca', async () => {
      prisma.brand.findUnique.mockResolvedValue(null);
      await expect(service.getMe('user-1')).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── updateMe ───────────────────────────────────────────────────────────────

  describe('updateMe', () => {
    it('atualiza apenas os campos fornecidos', async () => {
      prisma.brand.update.mockResolvedValue(makeBrand({ bio: 'Nova bio' }));

      await service.updateMe('user-1', { bio: 'Nova bio', name: 'Marca Nova' });

      expect(prisma.brand.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { name: 'Marca Nova', bio: 'Nova bio' },
      });
    });

    it('não inclui no data os campos não fornecidos (undefined)', async () => {
      prisma.brand.update.mockResolvedValue(makeBrand());

      await service.updateMe('user-1', { website: 'https://novo.com' });

      const callArg = prisma.brand.update.mock.calls[0][0];
      expect(callArg.data).toEqual({ website: 'https://novo.com' });
      expect('name' in callArg.data).toBe(false);
    });

    it('mapeia P2025 (registro inexistente) para ForbiddenException', async () => {
      prisma.brand.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('not found', {
          code: 'P2025',
          clientVersion: 'test',
        }),
      );

      await expect(service.updateMe('user-1', { name: 'X' })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
