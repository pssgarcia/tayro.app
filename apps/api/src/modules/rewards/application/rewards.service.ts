import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { RewardStatus } from '@prisma/client';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { CreateRewardDto } from './dtos/create-reward.dto';

@Injectable()
export class RewardsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateRewardDto) {
    const brand = await this.findBrandOrFail(userId);

    // Verifica que a campanha pertence ao brand
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: dto.campaignId },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.brandId !== brand.id) throw new ForbiddenException('Not your campaign');

    // Verifica que o influencer tem conteúdo aprovado nessa campanha
    const hasApprovedContent = await this.prisma.contentSubmission.findFirst({
      where: {
        status: 'APPROVED',
        application: {
          campaignId: dto.campaignId,
          influencerId: dto.influencerId,
          status: 'APPROVED',
        },
      },
    });
    if (!hasApprovedContent) {
      throw new BadRequestException('Influencer has no approved content for this campaign');
    }

    return this.prisma.reward.create({
      data: {
        influencerId: dto.influencerId,
        campaignId: dto.campaignId,
        type: dto.type,
        value: dto.value,
        notes: dto.notes,
      },
    });
  }

  async markAsIssued(id: string, userId: string) {
    const reward = await this.findOwnedOrFail(id, userId);

    if (reward.status !== RewardStatus.PENDING) {
      throw new BadRequestException('Reward is already issued or delivered');
    }

    return this.prisma.reward.update({
      where: { id },
      data: { status: RewardStatus.ISSUED, issuedAt: new Date() },
    });
  }

  async markAsDelivered(id: string, userId: string) {
    const reward = await this.findOwnedOrFail(id, userId);

    if (reward.status !== RewardStatus.ISSUED) {
      throw new BadRequestException('Reward must be issued before marking as delivered');
    }

    return this.prisma.reward.update({
      where: { id },
      data: { status: RewardStatus.DELIVERED },
    });
  }

  async findByCampaign(campaignId: string, userId: string) {
    const brand = await this.findBrandOrFail(userId);

    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.brandId !== brand.id) throw new ForbiddenException('Not your campaign');

    return this.prisma.reward.findMany({
      where: { campaignId },
      orderBy: { createdAt: 'desc' },
      include: {
        influencer: { select: { name: true, avatarUrl: true, instagramHandle: true } },
      },
    });
  }

  async findMine(userId: string) {
    const influencer = await this.prisma.influencer.findUnique({ where: { userId } });
    if (!influencer) throw new ForbiddenException('User does not have an influencer profile');

    return this.prisma.reward.findMany({
      where: { influencerId: influencer.id },
      orderBy: { createdAt: 'desc' },
      include: {
        campaign: { select: { title: true, brand: { select: { name: true } } } },
      },
    });
  }

  // ─── Helpers privados ────────────────────────────────────────────────────────

  private async findBrandOrFail(userId: string) {
    const brand = await this.prisma.brand.findUnique({ where: { userId } });
    if (!brand) throw new ForbiddenException('User does not have a brand profile');
    return brand;
  }

  private async findOwnedOrFail(id: string, userId: string) {
    const brand = await this.findBrandOrFail(userId);
    const reward = await this.prisma.reward.findUnique({
      where: { id },
      include: { campaign: true },
    });
    if (!reward) throw new NotFoundException('Reward not found');
    if (reward.campaign.brandId !== brand.id) throw new ForbiddenException('Not your campaign');
    return reward;
  }
}
