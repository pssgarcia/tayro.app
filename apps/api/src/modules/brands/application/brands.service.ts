import { Injectable, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { UpdateBrandDto } from './dtos/update-brand.dto';

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { userId },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        niches: true,
        website: true,
        bio: true,
        createdAt: true,
        user: { select: { email: true } },
      },
    });
    if (!brand)
      throw new ForbiddenException('User does not have a brand profile');

    const { user, ...rest } = brand;
    return { ...rest, email: user.email };
  }

  async updateMe(userId: string, dto: UpdateBrandDto) {
    // Monta o data só com os campos enviados — undefined seria ignorado pelo
    // Prisma, mas ser explícito evita sobrescrever campos com undefined acidental.
    const data: Prisma.BrandUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.logoUrl !== undefined) data.logoUrl = dto.logoUrl;
    if (dto.niches !== undefined) data.niches = dto.niches;
    if (dto.website !== undefined) data.website = dto.website;
    if (dto.bio !== undefined) data.bio = dto.bio;

    try {
      return await this.prisma.brand.update({
        where: { userId },
        data,
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new ForbiddenException('User does not have a brand profile');
      }
      throw err;
    }
  }

  // ─── Exportar dados (LGPD art. 18 II/V) ─────────────────────────────────────────

  /**
   * Perfil da marca + o que ela criou/registrou no produto. As campanhas
   * trazem só a CONTAGEM de candidaturas, não o dado de cada creator — isso
   * não é dado pessoal da marca, é dado pessoal de outra pessoa titular.
   */
  async exportMyData(userId: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { userId },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        niches: true,
        website: true,
        bio: true,
        createdAt: true,
        user: { select: { email: true } },
      },
    });
    if (!brand) {
      throw new ForbiddenException('User does not have a brand profile');
    }

    const [campaigns, rewardsIssued, partnershipResults] = await Promise.all([
      this.prisma.campaign.findMany({
        where: { brandId: brand.id },
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          niches: true,
          maxSpots: true,
          deadline: true,
          offerType: true,
          offerAmount: true,
          offerDeadlineDays: true,
          offerDescription: true,
          offerCommissionPercent: true,
          createdAt: true,
          _count: { select: { applications: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.reward.findMany({
        where: { campaign: { brandId: brand.id } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.partnershipResult.findMany({
        where: { application: { campaign: { brandId: brand.id } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const { user, ...profile } = brand;

    return {
      exportedAt: new Date().toISOString(),
      profile: { ...profile, email: user.email },
      campaigns,
      rewardsIssued,
      partnershipResults,
    };
  }
}
