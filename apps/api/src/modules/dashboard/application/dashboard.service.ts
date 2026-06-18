import { Injectable, ForbiddenException } from '@nestjs/common';
import {
  ApplicationStatus,
  CampaignStatus,
  ContentStatus,
  RewardStatus,
} from '@prisma/client';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';

type StatusGroup = { status: string; _count: { _all: number } };

function toCountMap(groups: StatusGroup[]): Record<string, number> {
  return groups.reduce<Record<string, number>>((acc, g) => {
    acc[g.status] = g._count._all;
    return acc;
  }, {});
}

function sum(map: Record<string, number>): number {
  return Object.values(map).reduce((a, b) => a + b, 0);
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getForBrand(userId: string) {
    const brand = await this.prisma.brand.findUnique({ where: { userId } });
    if (!brand)
      throw new ForbiddenException('User does not have a brand profile');

    const brandId = brand.id;
    const campaignScope = { campaign: { brandId } };

    // Número fixo de agregações num único round-trip. As contagens são feitas
    // pelo Postgres (groupBy/count), nunca iterando campanhas no app (sem N+1).
    const [
      campaignGroups,
      applicationGroups,
      contentPendingReview,
      rewardGroups,
    ] = await this.prisma.$transaction([
      this.prisma.campaign.groupBy({
        by: ['status'],
        where: { brandId },
        orderBy: { status: 'asc' },
        _count: { _all: true },
      }),
      this.prisma.application.groupBy({
        by: ['status'],
        where: campaignScope,
        orderBy: { status: 'asc' },
        _count: { _all: true },
      }),
      this.prisma.contentSubmission.count({
        where: { status: ContentStatus.PENDING, application: campaignScope },
      }),
      this.prisma.reward.groupBy({
        by: ['status'],
        where: campaignScope,
        orderBy: { status: 'asc' },
        _count: { _all: true },
      }),
    ]);

    const campaignByStatus = toCountMap(campaignGroups as StatusGroup[]);
    const applicationByStatus = toCountMap(applicationGroups as StatusGroup[]);
    const rewardByStatus = toCountMap(rewardGroups as StatusGroup[]);

    return {
      campaigns: {
        total: sum(campaignByStatus),
        active: campaignByStatus[CampaignStatus.ACTIVE] ?? 0,
        draft: campaignByStatus[CampaignStatus.DRAFT] ?? 0,
        closed: campaignByStatus[CampaignStatus.CLOSED] ?? 0,
        completed: campaignByStatus[CampaignStatus.COMPLETED] ?? 0,
      },
      applications: {
        total: sum(applicationByStatus),
        pending: applicationByStatus[ApplicationStatus.PENDING] ?? 0,
        approved: applicationByStatus[ApplicationStatus.APPROVED] ?? 0,
        rejected: applicationByStatus[ApplicationStatus.REJECTED] ?? 0,
      },
      content: {
        pendingReview: contentPendingReview,
      },
      rewards: {
        total: sum(rewardByStatus),
        pending: rewardByStatus[RewardStatus.PENDING] ?? 0,
        issued: rewardByStatus[RewardStatus.ISSUED] ?? 0,
        delivered: rewardByStatus[RewardStatus.DELIVERED] ?? 0,
      },
    };
  }
}
