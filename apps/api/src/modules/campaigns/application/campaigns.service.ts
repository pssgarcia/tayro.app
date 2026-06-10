import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ApplicationStatus, CampaignStatus } from '@prisma/client';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { paginate, buildPaginatedResult } from '../../../shared/utils/pagination';
import { CreateCampaignDto } from './dtos/create-campaign.dto';
import { UpdateCampaignDto } from './dtos/update-campaign.dto';
import { ListCampaignsDto } from './dtos/list-campaigns.dto';

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateCampaignDto) {
    const brand = await this.findBrandOrFail(userId);

    return this.prisma.campaign.create({
      data: {
        brandId: brand.id,
        title: dto.title,
        description: dto.description,
        briefUrl: dto.briefUrl,
        niches: dto.niches,
        maxSpots: dto.maxSpots,
        rewardType: dto.rewardType ?? 'MONETARY',
        rewardValue: dto.rewardValue ?? '',
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
        offerType: dto.offerType,
        offerAmount: dto.offerAmount,
        offerDeadlineDays: dto.offerDeadlineDays,
        offerDescription: dto.offerDescription,
        status: CampaignStatus.DRAFT,
      },
    });
  }

  async findAll(query: ListCampaignsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const niches = query.niches
      ?.split(',')
      .map((n) => n.trim())
      .filter(Boolean);

    const where = {
      status: CampaignStatus.ACTIVE,
      ...(query.rewardType && { rewardType: query.rewardType }),
      ...(niches?.length && { niches: { hasSome: niches } }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.campaign.findMany({
        where,
        ...paginate({ page, limit }),
        orderBy: { createdAt: 'desc' },
        include: { brand: { select: { name: true, logoUrl: true } } },
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return buildPaginatedResult(data, total, { page, limit });
  }

  async findMine(userId: string) {
    const brand = await this.findBrandOrFail(userId);

    return this.prisma.campaign.findMany({
      where: { brandId: brand.id },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { applications: true } } },
    });
  }

  async findOne(id: string, viewerId?: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: {
        brand: { select: { name: true, logoUrl: true, website: true } },
        _count: {
          select: {
            applications: { where: { status: ApplicationStatus.APPROVED } },
          },
        },
      },
    });

    if (!campaign) throw new NotFoundException('Campaign not found');

    if (campaign.status !== CampaignStatus.ACTIVE) {
      // Non-ACTIVE campaigns visible only to their brand owner
      const isOwner = viewerId
        ? await this.prisma.brand.count({ where: { id: campaign.brandId, userId: viewerId } })
        : 0;
      // 404 em vez de 403 — não vaza que a campanha existe como DRAFT
      if (!isOwner) throw new NotFoundException('Campaign not found');
    }

    return campaign;
  }

  async update(id: string, userId: string, dto: UpdateCampaignDto) {
    const campaign = await this.findOwnedOrFail(id, userId);

    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new BadRequestException('Only draft campaigns can be edited');
    }

    const { deadline, ...rest } = dto;

    return this.prisma.campaign.update({
      where: { id },
      data: {
        ...rest,
        ...(deadline !== undefined && { deadline: new Date(deadline) }),
      },
    });
  }

  async publish(id: string, userId: string) {
    const campaign = await this.findOwnedOrFail(id, userId);

    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new BadRequestException('Only draft campaigns can be published');
    }

    return this.prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.ACTIVE },
    });
  }

  async close(id: string, userId: string) {
    const campaign = await this.findOwnedOrFail(id, userId);

    if (campaign.status !== CampaignStatus.ACTIVE) {
      throw new BadRequestException('Only active campaigns can be closed');
    }

    return this.prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.CLOSED },
    });
  }

  async remove(id: string, userId: string) {
    const campaign = await this.findOwnedOrFail(id, userId);

    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new BadRequestException('Only draft campaigns can be deleted');
    }

    await this.prisma.campaign.delete({ where: { id } });
  }

  // ─── Helpers privados ────────────────────────────────────────────────────────

  private async findBrandOrFail(userId: string) {
    const brand = await this.prisma.brand.findUnique({ where: { userId } });
    if (!brand) throw new ForbiddenException('User does not have a brand profile');
    return brand;
  }

  private async findOwnedOrFail(id: string, userId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: { brand: true },
    });

    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.brand.userId !== userId) throw new ForbiddenException('Not your campaign');

    return campaign;
  }
}
