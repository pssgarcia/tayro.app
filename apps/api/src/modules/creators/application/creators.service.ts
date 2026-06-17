import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import {
  ApplicationStatus,
  CampaignStatus,
  ContentStatus,
  IgFetchStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { InstagramSyncService } from '../../instagram/instagram-sync.service';
import { PublicApplyDto } from './dtos/public-apply.dto';

@Injectable()
export class CreatorsService {
  private readonly logger = new Logger(CreatorsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly instagramSync: InstagramSyncService,
  ) {}

  // ─── Candidatura pública ──────────────────────────────────────────────────────

  async applyPublic(campaignId: string, dto: PublicApplyDto) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) throw new NotFoundException('Programa não encontrado');
    if (campaign.status !== CampaignStatus.ACTIVE) {
      throw new BadRequestException(
        'Este programa não está aceitando candidaturas',
      );
    }

    const influencer = await this.findOrCreateInfluencer(dto);

    try {
      const application = await this.prisma.application.create({
        data: { campaignId, influencerId: influencer.id, message: dto.message },
      });

      this.scheduleIgFetch(influencer.id);

      return { applicationId: application.id, status: application.status };
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('Você já se candidatou a este programa');
      }
      throw err;
    }
  }

  // ─── Perfil público ───────────────────────────────────────────────────────────

  async getPublicProfile(handle: string) {
    const influencer = await this.prisma.influencer.findUnique({
      where: { instagramHandle: handle.toLowerCase() },
      include: {
        applications: {
          where: { status: ApplicationStatus.APPROVED },
          include: {
            result: true,
            submissions: {
              where: { status: ContentStatus.APPROVED },
              select: { id: true },
            },
          },
        },
      },
    });

    if (!influencer || !influencer.publicProfileEnabled) {
      throw new NotFoundException('Perfil não encontrado');
    }

    const completedPartnerships = influencer.applications.filter(
      (app) => app.submissions.length > 0,
    ).length;

    const results = influencer.applications
      .filter((app) => app.result?.visibleToCreator)
      .map(({ result }) => ({
        reach: result!.reach,
        impressions: result!.impressions,
        couponsUsed: result!.couponsUsed,
        note: result!.note,
        createdAt: result!.createdAt,
      }));

    return {
      handle: influencer.instagramHandle,
      name: influencer.name,
      avatarUrl: influencer.avatarUrl,
      bio: influencer.bio,
      niches: influencer.niches,
      city: influencer.city,
      followersCount: influencer.followersCount,
      igEngagementRate: influencer.igEngagementRate,
      igRecentPosts: influencer.igRecentPosts,
      igFetchStatus: influencer.igFetchStatus,
      completedPartnerships,
      results,
    };
  }

  // ─── Helpers privados ─────────────────────────────────────────────────────────

  private scheduleIgFetch(influencerId: string): void {
    setImmediate(() => {
      this.instagramSync
        .refresh(influencerId)
        .catch((err: unknown) =>
          this.logger.error('scheduleIgFetch failed', err),
        );
    });
  }

  private async findOrCreateInfluencer(dto: PublicApplyDto) {
    const byHandle = await this.prisma.influencer.findUnique({
      where: { instagramHandle: dto.igHandle },
    });
    if (byHandle) return byHandle;

    const userByEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (userByEmail) {
      if (userByEmail.role !== UserRole.INFLUENCER) {
        throw new ConflictException('Este e-mail já está cadastrado');
      }
      const existing = await this.prisma.influencer.findUnique({
        where: { userId: userByEmail.id },
      });
      if (existing) {
        if (!existing.instagramHandle) {
          return this.prisma.influencer.update({
            where: { id: existing.id },
            data: { instagramHandle: dto.igHandle },
          });
        }
        return existing;
      }
    }

    const randomPassword = await bcrypt.hash(randomUUID(), 10);
    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password: randomPassword,
          role: UserRole.INFLUENCER,
          influencer: {
            create: {
              name: dto.name ?? dto.igHandle,
              instagramHandle: dto.igHandle,
              igFetchStatus: IgFetchStatus.PENDING,
            },
          },
        },
        include: { influencer: true },
      });

      return user.influencer!;
    } catch (err) {
      // Race condition: entre os findUnique acima e este create, outro request
      // concorrente pode ter criado o mesmo igHandle/email (ambos @unique). O
      // Postgres rejeita com P2002. Em vez de vazar 500, reusamos o registro
      // que o request concorrente acabou de criar.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const existing = await this.findExistingInfluencer(dto);
        if (existing) return existing;
      }
      throw err;
    }
  }

  /** Rebusca o influencer por handle ou email após uma colisão P2002 concorrente. */
  private async findExistingInfluencer(dto: PublicApplyDto) {
    const byHandle = await this.prisma.influencer.findUnique({
      where: { instagramHandle: dto.igHandle },
    });
    if (byHandle) return byHandle;

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { influencer: true },
    });
    return user?.influencer ?? null;
  }
}
