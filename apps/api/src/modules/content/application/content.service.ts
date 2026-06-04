import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ApplicationStatus, ContentStatus } from '@prisma/client';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { CreateSubmissionDto } from './dtos/create-submission.dto';
import { ReviewSubmissionDto } from './dtos/review-submission.dto';

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  async submit(userId: string, dto: CreateSubmissionDto) {
    const influencer = await this.findInfluencerOrFail(userId);

    // Application precisa existir, ser do influencer e estar APPROVED
    const application = await this.prisma.application.findUnique({
      where: { id: dto.applicationId },
    });

    if (!application) throw new NotFoundException('Application not found');
    if (application.influencerId !== influencer.id) throw new ForbiddenException('Not your application');
    if (application.status !== ApplicationStatus.APPROVED) {
      throw new BadRequestException('Your application must be approved before submitting content');
    }

    return this.prisma.contentSubmission.create({
      data: {
        applicationId: dto.applicationId,
        mediaUrl: dto.mediaUrl,
        mediaType: dto.mediaType,
        caption: dto.caption,
      },
    });
  }

  async findMine(userId: string) {
    const influencer = await this.findInfluencerOrFail(userId);

    return this.prisma.contentSubmission.findMany({
      where: { application: { influencerId: influencer.id } },
      orderBy: { submittedAt: 'desc' },
      include: {
        application: {
          select: {
            campaign: { select: { title: true, brand: { select: { name: true } } } },
          },
        },
      },
    });
  }

  async findByApplication(applicationId: string, userId: string) {
    // Tanto influencer dono quanto brand da campanha podem ver
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { campaign: { include: { brand: true } }, influencer: true },
    });

    if (!application) throw new NotFoundException('Application not found');

    const isInfluencerOwner = application.influencer.userId === userId;
    const isCampaignBrand = application.campaign.brand.userId === userId;

    if (!isInfluencerOwner && !isCampaignBrand) throw new ForbiddenException('Access denied');

    return this.prisma.contentSubmission.findMany({
      where: { applicationId },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async approve(id: string, userId: string, dto: ReviewSubmissionDto) {
    const submission = await this.findWithCampaignOrFail(id);

    if (submission.application.campaign.brand.userId !== userId) throw new ForbiddenException('Not your campaign');
    if (submission.status !== ContentStatus.PENDING) {
      throw new BadRequestException('Submission is not pending');
    }

    return this.prisma.contentSubmission.update({
      where: { id },
      data: { status: ContentStatus.APPROVED, feedback: dto.feedback, reviewedAt: new Date() },
    });
  }

  async reject(id: string, userId: string, dto: ReviewSubmissionDto) {
    const submission = await this.findWithCampaignOrFail(id);

    if (submission.application.campaign.brand.userId !== userId) throw new ForbiddenException('Not your campaign');
    if (submission.status !== ContentStatus.PENDING) {
      throw new BadRequestException('Submission is not pending');
    }

    return this.prisma.contentSubmission.update({
      where: { id },
      data: { status: ContentStatus.REJECTED, feedback: dto.feedback, reviewedAt: new Date() },
    });
  }

  async requestRevision(id: string, userId: string, dto: ReviewSubmissionDto) {
    const submission = await this.findWithCampaignOrFail(id);

    if (submission.application.campaign.brand.userId !== userId) throw new ForbiddenException('Not your campaign');
    if (submission.status !== ContentStatus.PENDING) {
      throw new BadRequestException('Submission is not pending');
    }
    if (!dto.feedback?.trim()) {
      throw new BadRequestException('Feedback is required when requesting revision');
    }

    return this.prisma.contentSubmission.update({
      where: { id },
      data: { status: ContentStatus.REVISION_REQUESTED, feedback: dto.feedback, reviewedAt: new Date() },
    });
  }

  // ─── Helpers privados ────────────────────────────────────────────────────────

  private async findInfluencerOrFail(userId: string) {
    const influencer = await this.prisma.influencer.findUnique({ where: { userId } });
    if (!influencer) throw new ForbiddenException('User does not have an influencer profile');
    return influencer;
  }

  private async findWithCampaignOrFail(id: string) {
    const submission = await this.prisma.contentSubmission.findUnique({
      where: { id },
      include: {
        application: { include: { campaign: { include: { brand: true } } } },
      },
    });
    if (!submission) throw new NotFoundException('Submission not found');
    return submission;
  }
}
