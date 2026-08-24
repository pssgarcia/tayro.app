import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IgFetchStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/infrastructure/database/prisma.service';
import { INSTAGRAM_PROVIDER } from './instagram.constants';
import type { InstagramProvider } from './instagram.types';
import { calcEngagementRate } from './engagement.utils';
import { IgImageService } from './ig-image.service';

@Injectable()
export class InstagramSyncService {
  private readonly logger = new Logger(InstagramSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(INSTAGRAM_PROVIDER) private readonly provider: InstagramProvider,
    private readonly igImages: IgImageService,
  ) {}

  /**
   * Dispara uma sincronização em background e retorna na hora.
   *
   * Usado por todo caminho em que uma creator entra no sistema ou se candidata
   * — a resposta HTTP dela não pode esperar uma API externa. Falha aqui é
   * logada e morre aqui: quem agendou nunca é derrubado.
   *
   * `refresh` respeita o período de validade (24h), então chamar isto de
   * vários pontos não multiplica consumo de cota — candidatura de creator com
   * dado fresco sai sem tocar no provedor.
   */
  scheduleRefresh(influencerId: string): void {
    setImmediate(() => {
      this.refresh(influencerId).catch((err: unknown) => {
        const reason = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `Sync agendado falhou para influencer ${influencerId}: ${reason}`,
        );
      });
    });
  }

  /**
   * Atualiza dados do Instagram de um influencer.
   * force=false  → pula se dados estiverem frescos (IG_FETCH_STALENESS_HOURS).
   * force=true   → sempre busca; usado por endpoint manual (o cooldown fica na
   *                camada do controller/service chamador).
   * Em caso de falha: persiste igFetchStatus=FAILED + igFetchedAt=now (para
   * que o cooldown do refresh manual funcione mesmo sem dados novos).
   */
  async refresh(
    influencerId: string,
    { force = false }: { force?: boolean } = {},
  ): Promise<void> {
    const influencer = await this.prisma.influencer.findUnique({
      where: { id: influencerId },
      select: { instagramHandle: true, igFetchStatus: true, igFetchedAt: true },
    });

    if (!influencer?.instagramHandle) return;

    // Strip @ defensivamente — DTOs normalizam na entrada, mas dados
    // inseridos fora do fluxo padrão (ex: Neon console) podem ter @ prefixado.
    const handle = influencer.instagramHandle.replace(/^@+/, '');

    if (!force) {
      const stalenessHours = parseInt(
        this.config.get<string>('IG_FETCH_STALENESS_HOURS', '24'),
        10,
      );
      const fetchedAt = influencer.igFetchedAt;
      const isFresh =
        influencer.igFetchStatus === IgFetchStatus.OK &&
        fetchedAt !== null &&
        Date.now() - fetchedAt.getTime() < stalenessHours * 3_600_000;
      if (isFresh) return;
    }

    await this.prisma.influencer.update({
      where: { id: influencerId },
      data: {
        igFetchStatus: IgFetchStatus.PENDING,
      },
    });

    try {
      const profile = await this.provider.fetchProfile(handle);
      const igEngagementRate = calcEngagementRate(
        profile.recentPosts,
        profile.followers,
      );

      await this.prisma.influencer.update({
        where: { id: influencerId },
        data: {
          followersCount: profile.followers,
          igEngagementRate,
          igRecentPosts: profile.recentPosts as unknown as Prisma.JsonArray,
          igProfilePicUrl: profile.profilePicUrl,
          igFetchedAt: new Date(),
          igFetchStatus: IgFetchStatus.OK,
        },
      });

      // Guardar as imagens é best-effort e tem `catch` PRÓPRIO: se ficasse no
      // try de fora, uma falha aqui cairia no catch do sync e marcaria FAILED
      // um sync que deu certo — apagando dado bom por causa de uma foto. As
      // URLs da CDN expiram; é por guardar os bytes que a foto para de sumir
      // (D-18).
      try {
        await this.igImages.storeFromProfile(
          influencerId,
          profile.profilePicUrl,
          profile.recentPosts.map((post) => post.thumbnail),
        );
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Sync OK, mas falhou ao guardar imagens de ${influencerId}: ${reason}`,
        );
      }
    } catch (err) {
      // Mantém valores anteriores; igFetchedAt=now para o cooldown do refresh manual
      await this.prisma.influencer.update({
        where: { id: influencerId },
        data: {
          igFetchStatus: IgFetchStatus.FAILED,
          igFetchedAt: new Date(),
        },
      });
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Instagram fetch failed for influencer ${influencerId}: ${reason}`,
      );
    }
  }
}
