import { Controller, Get, Param, Req, Res, Logger } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { IgImageKind } from '@prisma/client';
import type { Request, Response } from 'express';
import { PrismaService } from '../../shared/infrastructure/database/prisma.service';
import {
  IgImageService,
  MAX_STORED_POSTS,
  type StoredImage,
} from './ig-image.service';
import { IgImageAccessService } from './ig-image-access.service';

// O Instagram serve fotos de perfil com Cross-Origin-Resource-Policy: same-origin,
// o que impede o browser de exibi-las num <img> cross-origin. Este controller
// serve a imagem pelo nosso domínio, resolvendo isso.
//
// Desde a D-18 a imagem vem do NOSSO banco, não de um fetch na CDN a cada
// requisição: as URLs do Instagram são assinadas e expiram, e a foto sumia da
// tela quando isso acontecia. A URL guardada continua sendo usada como origem
// no primeiro acesso (backfill), nunca como fonte da exibição.
//
// A rota continua SEM `@UseGuards` porque `<img>` não manda header de
// autorização — mas deixou de ser irrestrita: quem pode ver é decidido pelo
// `IgImageAccessService` (perfil público ligado, a própria creator, ou marca
// com candidatura dela). Ver o cabeçalho daquele arquivo.

@Controller('ig')
export class IgAvatarController {
  private readonly logger = new Logger(IgAvatarController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly igImages: IgImageService,
    private readonly access: IgImageAccessService,
  ) {}

  /**
   * Foto de perfil da creator. Sem autorização → 404, e o front cai nas
   * iniciais (mesma resposta de imagem ausente: não revela se o id existe).
   */
  @Get('avatar/:influencerId')
  @SkipThrottle()
  async avatar(
    @Param('influencerId') influencerId: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    await this.serve(
      res,
      req,
      influencerId,
      IgImageKind.PROFILE,
      0,
      async () => {
        const influencer = await this.prisma.influencer.findUnique({
          where: { id: influencerId },
          select: { igProfilePicUrl: true },
        });
        return influencer?.igProfilePicUrl ?? null;
      },
    );
  }

  /**
   * Thumbnail de um post recente. Mesma política da foto de perfil.
   * `position` fora da faixa → 404 sem tocar no banco.
   */
  @Get('post/:influencerId/:position')
  @SkipThrottle()
  async post(
    @Param('influencerId') influencerId: string,
    @Param('position') rawPosition: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const position = Number(rawPosition);
    if (
      !Number.isInteger(position) ||
      position < 0 ||
      position >= MAX_STORED_POSTS
    ) {
      res.status(404).end();
      return;
    }

    await this.serve(
      res,
      req,
      influencerId,
      IgImageKind.POST,
      position,
      async () => {
        const influencer = await this.prisma.influencer.findUnique({
          where: { id: influencerId },
          select: { igRecentPosts: true },
        });
        const posts = influencer?.igRecentPosts as
          | { thumbnail?: string }[]
          | null
          | undefined;
        return posts?.[position]?.thumbnail ?? null;
      },
    );
  }

  /**
   * Caminho comum: autoriza, tenta o banco, cai no backfill a partir da URL de
   * origem, e responde 404 quando não há autorização, nem imagem, nem origem.
   *
   * A autorização vem ANTES de qualquer leitura de imagem ou requisição
   * externa: sem isso, um id não autorizado ainda faria o backfill baixar a
   * foto da CDN do Instagram para então recusá-la.
   */
  private async serve(
    res: Response,
    req: Request,
    influencerId: string,
    kind: IgImageKind,
    position: number,
    resolveSourceUrl: () => Promise<string | null>,
  ): Promise<void> {
    try {
      if (!(await this.access.canView(influencerId, req))) {
        res.status(404).end();
        return;
      }

      let image: StoredImage | null = await this.igImages.find(
        influencerId,
        kind,
        position,
      );

      if (!image) {
        const sourceUrl = await resolveSourceUrl();
        image = await this.igImages.findOrBackfill(
          influencerId,
          kind,
          position,
          sourceUrl,
        );
      }

      if (!image) {
        res.status(404).end();
        return;
      }

      // O tipo de mídia é o que foi GUARDADO, nunca o que o upstream declarar
      // no momento da entrega.
      res.setHeader('Content-Type', image.mimeType);

      // `public` só quando a imagem é mesmo pública. Para perfil não público a
      // resposta depende de quem pediu (cookie), então um cache compartilhado
      // (a borda da Vercel, um proxy corporativo) poderia entregar a foto a
      // quem não passou pela autorização acima. `private` mantém o cache do
      // navegador, que é o que importa para `<img>`, sem esse risco.
      const publiclyVisible = await this.access.isPubliclyVisible(influencerId);
      res.setHeader(
        'Cache-Control',
        publiclyVisible ? 'public, max-age=86400' : 'private, max-age=86400',
      );
      res.setHeader('Vary', 'Cookie, Authorization');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.end(image.data);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Imagem ${kind}#${position} falhou para ${influencerId}: ${reason}`,
      );
      if (!res.headersSent) res.status(404).end();
    }
  }
}
