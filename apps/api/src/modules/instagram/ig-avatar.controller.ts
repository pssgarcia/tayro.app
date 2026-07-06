import { Controller, Get, Param, Res, Logger } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { PrismaService } from '../../shared/infrastructure/database/prisma.service';

// O Instagram serve fotos de perfil com Cross-Origin-Resource-Policy: same-origin,
// o que impede o browser de exibi-las num <img> cross-origin. Este proxy busca a
// imagem server-side (onde CORP não se aplica) e a re-serve pelo nosso domínio.
//
// SSRF: a URL NUNCA vem do cliente — é lida do banco (gravada só pelo nosso sync
// a partir da API do IG) e ainda validada contra uma allow-list de hosts.
const ALLOWED_HOST_SUFFIXES = ['.cdninstagram.com', '.fbcdn.net'];
const UPSTREAM_TIMEOUT_MS = 8000;

@Controller('ig')
export class IgAvatarController {
  private readonly logger = new Logger(IgAvatarController.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Proxy público da foto de perfil do IG de uma creator.
   * Público de propósito: é carregado via <img>, que não anexa o bearer token
   * (accessToken vive só em memória). A imagem já é pública no Instagram.
   * Falha/ausência → 404, e o Avatar do front cai nas iniciais.
   */
  @Get('avatar/:influencerId')
  @SkipThrottle()
  async avatar(
    @Param('influencerId') influencerId: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const influencer = await this.prisma.influencer.findUnique({
        where: { id: influencerId },
        select: { igProfilePicUrl: true },
      });

      const url = influencer?.igProfilePicUrl;
      if (!url || !this.isAllowedHost(url)) {
        res.status(404).end();
        return;
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
      let upstream: globalThis.Response;
      try {
        upstream = await fetch(url, { signal: controller.signal });
      } finally {
        clearTimeout(timer);
      }

      if (!upstream.ok) {
        res.status(404).end();
        return;
      }

      const buffer = Buffer.from(await upstream.arrayBuffer());
      res.setHeader(
        'Content-Type',
        upstream.headers.get('content-type') ?? 'image/jpeg',
      );
      // Cacheia 1 dia no browser; a URL do IG expira em ~2 semanas e o sync a renova.
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.end(buffer);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Avatar proxy falhou para ${influencerId}: ${reason}`);
      if (!res.headersSent) res.status(404).end();
    }
  }

  private isAllowedHost(rawUrl: string): boolean {
    try {
      const { protocol, hostname } = new URL(rawUrl);
      if (protocol !== 'https:') return false;
      return ALLOWED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
    } catch {
      return false;
    }
  }
}
