import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { PrismaService } from '../../shared/infrastructure/database/prisma.service';

/**
 * Quem pode ver as imagens de Instagram que guardamos de uma creator.
 *
 * ─── Por que existe ─────────────────────────────────────────────────────────
 * `GET /ig/avatar/:influencerId` e `GET /ig/post/:influencerId/:position`
 * nasceram PÚBLICOS e sem checagem nenhuma, por um motivo técnico real: são
 * carregados por `<img>`, que não anexa o header `Authorization` (o access
 * token vive só em memória no front). A consequência não intencional é que
 * `publicProfileEnabled = false` deixava de valer para as imagens: uma marca
 * que viu a creator uma vez guardava acesso permanente e não autenticado às
 * fotos dela, mesmo depois de a creator desligar o perfil público ou de a
 * relação terminar, e podia repassar a URL a qualquer pessoa.
 *
 * ─── Como resolvemos sem quebrar o `<img>` ──────────────────────────────────
 * O cookie `refresh_token` (httpOnly) É enviado em requisição de `<img>`:
 * mesma origem (em produção `/api/*` é rewrite same-origin na Vercel; em dev,
 * o proxy do Vite) e `sameSite: 'lax'`. Então é ele que identifica o
 * espectador aqui. O header `Authorization` também é aceito, para chamada
 * direta à API e para teste.
 *
 * Não é autenticação de sessão: só resolve QUEM está pedindo. Um token de
 * refresh válido cujo hash já foi rotacionado ainda identifica a pessoa, e
 * isso é suficiente para decidir se ela pode ver uma foto que o Instagram já
 * publica abertamente. Trocar isto por validação de sessão completa exigiria
 * consultar `refreshTokenHash` e derrubaria a imagem em toda aba antiga.
 */
@Injectable()
export class IgImageAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Três permissões, nesta ordem de custo:
   *  1. perfil público ligado: a creator escolheu publicar o media kit;
   *  2. a própria creator (a prévia do Perfil dela mostra a própria foto);
   *  3. marca com candidatura desta creator em alguma campanha dela — é o que
   *     sustenta a Fila, Creators, Entregas, Recompensas e Resultado.
   *
   * Qualquer outro caso: `false`, e o controller responde 404 (não 403) para
   * não revelar se o id existe. O front já cai nas iniciais.
   */
  async canView(influencerId: string, req: Request): Promise<boolean> {
    const influencer = await this.prisma.influencer.findUnique({
      where: { id: influencerId },
      select: { userId: true, publicProfileEnabled: true },
    });
    if (!influencer) return false;
    if (influencer.publicProfileEnabled) return true;

    const viewerId = this.resolveViewerId(req);
    if (!viewerId) return false;
    if (viewerId === influencer.userId) return true;

    const relatedApplications = await this.prisma.application.count({
      where: {
        influencerId,
        campaign: { brand: { userId: viewerId } },
      },
    });
    return relatedApplications > 0;
  }

  /** `true` quando a imagem pode ir para cache compartilhado (perfil público). */
  async isPubliclyVisible(influencerId: string): Promise<boolean> {
    const influencer = await this.prisma.influencer.findUnique({
      where: { id: influencerId },
      select: { publicProfileEnabled: true },
    });
    return influencer?.publicProfileEnabled ?? false;
  }

  /**
   * Identidade do espectador a partir do cookie de refresh ou do header
   * Authorization. Token inválido/expirado/ausente → `null`, nunca exceção:
   * daqui sai uma decisão de exibir imagem, não um erro de autenticação.
   */
  private resolveViewerId(req: Request): string | null {
    const fromCookie = this.verify(
      req.cookies?.['refresh_token'],
      'JWT_REFRESH_SECRET',
    );
    if (fromCookie) return fromCookie;

    const header = req.headers?.authorization;
    const bearer =
      typeof header === 'string' && header.startsWith('Bearer ')
        ? header.slice('Bearer '.length)
        : undefined;
    return this.verify(bearer, 'JWT_ACCESS_SECRET');
  }

  private verify(token: string | undefined, secretKey: string): string | null {
    if (!token) return null;
    try {
      const secret = this.config.get<string>(secretKey);
      if (!secret) return null;
      const payload = this.jwt.verify<{ sub?: unknown }>(token, { secret });
      return typeof payload.sub === 'string' ? payload.sub : null;
    } catch {
      return null;
    }
  }
}
