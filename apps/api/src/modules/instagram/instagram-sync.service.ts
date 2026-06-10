import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IgFetchStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/infrastructure/database/prisma.service';
import { INSTAGRAM_PROVIDER } from './instagram.constants';
import type { InstagramProvider } from './instagram.types';
import { calcEngagementRate } from './engagement.utils';

@Injectable()
export class InstagramSyncService {
  private readonly logger = new Logger(InstagramSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(INSTAGRAM_PROVIDER) private readonly provider: InstagramProvider,
  ) {}

  /**
   * Atualiza dados do Instagram de um influencer.
   * force=false  → pula se dados estiverem frescos (IG_FETCH_STALENESS_HOURS).
   * force=true   → sempre busca; usado por endpoint manual (o cooldown fica na
   *                camada do controller/service chamador).
   * Em caso de falha: persiste igFetchStatus=FAILED + igFetchedAt=now (para
   * que o cooldown do refresh manual funcione mesmo sem dados novos).
   */
  async refresh(influencerId: string, { force = false }: { force?: boolean } = {}): Promise<void> {
    const influencer = await this.prisma.influencer.findUnique({
      where: { id: influencerId },
      select: { instagramHandle: true, igFetchStatus: true, igFetchedAt: true },
    });

    if (!influencer?.instagramHandle) return;

    if (!force) {
      const stalenessHours = parseInt(
        this.config.get<string>('IG_FETCH_STALENESS_HOURS', '24'),
        10,
      );
      const fetchedAt = influencer.igFetchedAt as Date | null;
      const isFresh =
        influencer.igFetchStatus === IgFetchStatus.OK &&
        fetchedAt !== null &&
        Date.now() - fetchedAt.getTime() < stalenessHours * 3_600_000;
      if (isFresh) return;
    }

    await this.prisma.influencer.update({
      where: { id: influencerId },
      data: { igFetchStatus: IgFetchStatus.PENDING } as Prisma.InfluencerUpdateInput,
    });

    try {
      const profile = await this.provider.fetchProfile(influencer.instagramHandle);
      const igEngagementRate = calcEngagementRate(profile.recentPosts, profile.followers);

      await this.prisma.influencer.update({
        where: { id: influencerId },
        data: {
          followersCount: profile.followers,
          igEngagementRate,
          igRecentPosts: profile.recentPosts as unknown as Prisma.JsonArray,
          igFetchedAt: new Date(),
          igFetchStatus: IgFetchStatus.OK,
        } as Prisma.InfluencerUpdateInput,
      });
    } catch {
      // Mantém valores anteriores; igFetchedAt=now para o cooldown do refresh manual
      await this.prisma.influencer.update({
        where: { id: influencerId },
        data: {
          igFetchStatus: IgFetchStatus.FAILED,
          igFetchedAt: new Date(),
        } as Prisma.InfluencerUpdateInput,
      });
      this.logger.error(`Instagram fetch failed for influencer ${influencerId}`);
    }
  }
}
