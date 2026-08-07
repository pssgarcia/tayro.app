import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { InstagramSyncService } from '../../instagram/instagram-sync.service';
import { EmailService } from '../../email/email.service';
import { PublicApplyDto } from './dtos/public-apply.dto';
import { UpdateInfluencerDto } from './dtos/update-influencer.dto';

const CLAIM_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

@Injectable()
export class CreatorsService {
  private readonly logger = new Logger(CreatorsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly instagramSync: InstagramSyncService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
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
      id: influencer.id,
      handle: influencer.instagramHandle,
      name: influencer.name,
      avatarUrl: influencer.avatarUrl,
      igProfilePicUrl: influencer.igProfilePicUrl,
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

  // ─── Perfil do creator autenticado (me) ─────────────────────────────────────────

  async getMe(userId: string) {
    const influencer = await this.prisma.influencer.findUnique({
      where: { userId },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        bio: true,
        city: true,
        niches: true,
        instagramHandle: true, // read-only aqui (não editável neste fluxo)
        tiktokHandle: true,
        followersCount: true,
        igEngagementRate: true,
        igFetchStatus: true,
        publicProfileEnabled: true,
        createdAt: true,
        user: { select: { email: true } },
      },
    });
    if (!influencer) {
      throw new ForbiddenException('User does not have an influencer profile');
    }

    const { user, ...rest } = influencer;
    return { ...rest, email: user.email };
  }

  async updateMe(userId: string, dto: UpdateInfluencerDto) {
    // Monta o data só com os campos enviados — ser explícito evita sobrescrever
    // com undefined acidental. Nenhum campo aqui é @unique, então não há P2002.
    const data: Prisma.InfluencerUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.bio !== undefined) data.bio = dto.bio;
    if (dto.city !== undefined) data.city = dto.city;
    if (dto.avatarUrl !== undefined) data.avatarUrl = dto.avatarUrl;
    if (dto.niches !== undefined) data.niches = dto.niches;
    if (dto.tiktokHandle !== undefined) data.tiktokHandle = dto.tiktokHandle;
    if (dto.publicProfileEnabled !== undefined) {
      data.publicProfileEnabled = dto.publicProfileEnabled;
    }

    try {
      await this.prisma.influencer.update({ where: { userId }, data });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new ForbiddenException(
          'User does not have an influencer profile',
        );
      }
      throw err;
    }

    // Retorna o mesmo shape do getMe (com email) — mantém o contrato uniforme.
    return this.getMe(userId);
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

      // claimTokenHash só é zerado quando o claim é concluído — se ainda está
      // preenchido, a creator nunca definiu senha. O link antigo pode ter
      // expirado (ela reaplicando dias depois); reemite e reenvia.
      if (userByEmail.claimTokenHash && existing) {
        await this.issueClaimToken(userByEmail.id, dto.email, existing.name);
      }

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
    const claimToken = this.generateClaimToken();
    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password: randomPassword,
          role: UserRole.INFLUENCER,
          claimTokenHash: claimToken.tokenHash,
          claimTokenExpiresAt: claimToken.expiresAt,
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

      await this.sendClaimEmail(
        dto.email,
        user.influencer!.name,
        claimToken.rawToken,
      );

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

  // ─── Claim de conta CLAIMABLE ─────────────────────────────────────────────────

  private generateClaimToken(): {
    rawToken: string;
    tokenHash: string;
    expiresAt: Date;
  } {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + CLAIM_TOKEN_TTL_MS);
    return { rawToken, tokenHash, expiresAt };
  }

  /** Gera um novo token, grava e reenvia o e-mail de claim (caminho de reapply). */
  private async issueClaimToken(
    userId: string,
    email: string,
    creatorName: string,
  ): Promise<void> {
    const { rawToken, tokenHash, expiresAt } = this.generateClaimToken();
    await this.prisma.user.update({
      where: { id: userId },
      data: { claimTokenHash: tokenHash, claimTokenExpiresAt: expiresAt },
    });
    await this.sendClaimEmail(email, creatorName, rawToken);
  }

  private async sendClaimEmail(
    email: string,
    creatorName: string,
    rawToken: string,
  ): Promise<void> {
    const frontendUrl = this.config.getOrThrow<string>('FRONTEND_URL');
    await this.emailService.sendClaimAccount({
      to: email,
      creatorName,
      claimUrl: `${frontendUrl}/claim?token=${rawToken}`,
    });
  }
}
