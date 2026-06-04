import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ApplicationStatus, CampaignStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { CreateApplicationDto } from './dtos/create-application.dto';

@Injectable()
export class ApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateApplicationDto) {
    const influencer = await this.findInfluencerOrFail(userId);

    const campaign = await this.prisma.campaign.findUnique({
      where: { id: dto.campaignId },
      include: {
        _count: {
          select: { applications: { where: { status: ApplicationStatus.APPROVED } } },
        },
      },
    });

    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.status !== CampaignStatus.ACTIVE) {
      throw new BadRequestException('Campaign is not accepting applications');
    }
    if (campaign._count.applications >= campaign.maxSpots) {
      throw new BadRequestException('Campaign is full');
    }

    try {
      return await this.prisma.application.create({
        data: {
          campaignId: dto.campaignId,
          influencerId: influencer.id,
          message: dto.message,
        },
      });
    } catch (err) {
      // Unique constraint: [campaignId, influencerId] — influencer já aplicou
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Already applied to this campaign');
      }
      throw err;
    }
  }

  async findMine(userId: string) {
    const influencer = await this.findInfluencerOrFail(userId);

    return this.prisma.application.findMany({
      where: { influencerId: influencer.id },
      orderBy: { appliedAt: 'desc' },
      include: {
        campaign: {
          select: {
            title: true,
            rewardType: true,
            rewardValue: true,
            status: true,
            deadline: true,
            brand: { select: { name: true, logoUrl: true } },
          },
        },
      },
    });
  }

  async findByCampaign(campaignId: string, userId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { brand: true },
    });

    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.brand.userId !== userId) throw new ForbiddenException('Not your campaign');

    return this.prisma.application.findMany({
      where: { campaignId },
      orderBy: { appliedAt: 'desc' },
      include: {
        influencer: {
          select: {
            name: true,
            avatarUrl: true,
            instagramHandle: true,
            niches: true,
            followersCount: true,
          },
        },
        _count: { select: { submissions: true } },
      },
    });
  }

  async approve(id: string, userId: string) {
    const application = await this.findWithCampaignOrFail(id);

    if (application.campaign.brand.userId !== userId) throw new ForbiddenException('Not your campaign');
    if (application.status !== ApplicationStatus.PENDING) {
      throw new BadRequestException('Application is not pending');
    }

    // Re-verifica vagas no momento da aprovação
    const approvedCount = await this.prisma.application.count({
      where: { campaignId: application.campaignId, status: ApplicationStatus.APPROVED },
    });
    if (approvedCount >= application.campaign.maxSpots) {
      throw new BadRequestException('Campaign is full');
    }

    return this.prisma.application.update({
      where: { id },
      data: { status: ApplicationStatus.APPROVED, reviewedAt: new Date() },
    });
  }

  async reject(id: string, userId: string) {
    const application = await this.findWithCampaignOrFail(id);

    if (application.campaign.brand.userId !== userId) throw new ForbiddenException('Not your campaign');
    if (application.status !== ApplicationStatus.PENDING) {
      throw new BadRequestException('Application is not pending');
    }

    return this.prisma.application.update({
      where: { id },
      data: { status: ApplicationStatus.REJECTED, reviewedAt: new Date() },
    });
  }

  async withdraw(id: string, userId: string) {
    const influencer = await this.findInfluencerOrFail(userId);
    const application = await this.prisma.application.findUnique({ where: { id } });

    if (!application) throw new NotFoundException('Application not found');
    if (application.influencerId !== influencer.id) throw new ForbiddenException('Not your application');
    if (application.status !== ApplicationStatus.PENDING) {
      throw new BadRequestException('Only pending applications can be withdrawn');
    }

    return this.prisma.application.update({
      where: { id },
      data: { status: ApplicationStatus.WITHDRAWN },
    });
  }

  // ─── Helpers privados ────────────────────────────────────────────────────────

  private async findInfluencerOrFail(userId: string) {
    const influencer = await this.prisma.influencer.findUnique({ where: { userId } });
    if (!influencer) throw new ForbiddenException('User does not have an influencer profile');
    return influencer;
  }

  private async findWithCampaignOrFail(id: string) {
    const application = await this.prisma.application.findUnique({
      where: { id },
      include: { campaign: { include: { brand: true } } },
    });
    if (!application) throw new NotFoundException('Application not found');
    return application;
  }
}
