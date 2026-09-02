import {
  Injectable,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { IgFetchStatus, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { InstagramSyncService } from '../../instagram/instagram-sync.service';
import { EmailService } from '../../email/email.service';
import { RegisterBrandDto } from './dtos/register-brand.dto';
import { RegisterInfluencerDto } from './dtos/register-influencer.dto';
import { LoginDto } from './dtos/login.dto';
import { ClaimAccountDto } from './dtos/claim-account.dto';
import { ForgotPasswordDto } from './dtos/forgot-password.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { ChangePasswordDto } from './dtos/change-password.dto';

type AuthUser = { id: string; email: string; role: UserRole };

// Janela curta de propósito: quem pede reset está travado agora, não é um
// "venha quando quiser" como o claim (7 dias) — reduz o tempo em que um
// e-mail interceptado pode virar tomada de conta.
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly instagramSync: InstagramSyncService,
    private readonly emailService: EmailService,
  ) {}

  async registerBrand(dto: RegisterBrandDto) {
    const hash = await bcrypt.hash(dto.password, 12);

    // Sem check-then-act: confiamos na constraint @unique de email, igual ao
    // cadastro de creator. O findUnique prévio que existia aqui abria uma
    // janela de corrida entre dois cadastros simultâneos com o mesmo e-mail —
    // o segundo estourava P2002 sem tratamento (500 genérico) em vez de 409.
    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password: hash,
          role: UserRole.BRAND,
          brand: {
            create: {
              name: dto.brandName,
              niches: dto.niches ?? [],
              website: dto.website,
            },
          },
        },
      });

      return this.buildAuthResponse(user);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        // Mesmo formato do cadastro de creator ({ ..., field }) — é o que
        // permite ao front marcar o erro inline no campo certo.
        throw new ConflictException({
          statusCode: 409,
          error: 'Conflict',
          message: 'Este e-mail já está em uso',
          field: 'email',
        });
      }
      throw err;
    }
  }

  async registerInfluencer(dto: RegisterInfluencerDto) {
    const hash = await bcrypt.hash(dto.password, 12);

    // Sem check-then-act: confiamos nas constraints @unique (email e
    // instagramHandle). Isso evita race condition entre dois cadastros
    // simultâneos e nos dá o erro exato (qual campo colidiu) no catch.
    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password: hash,
          role: UserRole.INFLUENCER,
          influencer: {
            create: {
              name: dto.name,
              instagramHandle: dto.instagramHandle,
              niches: dto.niches ?? [],
              // PENDING desde o nascimento: o front trata null como falha, e
              // sem isto a creator cadastrada por aqui aparecia para a marca
              // como "Dados do Instagram indisponíveis" antes mesmo de existir
              // uma tentativa de busca (2026-08-24).
              igFetchStatus: IgFetchStatus.PENDING,
            },
          },
        },
        include: { influencer: true },
      });

      // Mesma promessa da candidatura pública: quem entra no sistema com um @
      // tem os dados buscados. Em background — o cadastro não espera a API.
      if (user.influencer) {
        this.instagramSync.scheduleRefresh(user.influencer.id);
      }

      return this.buildAuthResponse(user);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        // P2002 expõe o(s) campo(s) que colidiram em meta.target (string | string[]).
        const rawTarget = err.meta?.target;
        const target = Array.isArray(rawTarget)
          ? rawTarget.join(',')
          : typeof rawTarget === 'string'
            ? rawTarget
            : '';
        if (target.includes('instagramHandle')) {
          throw new ConflictException({
            statusCode: 409,
            error: 'Conflict',
            message: 'Este @ do Instagram já está em uso por outra conta',
            field: 'instagramHandle',
          });
        }
        throw new ConflictException({
          statusCode: 409,
          error: 'Conflict',
          message: 'Este e-mail já está em uso',
          field: 'email',
        });
      }
      throw err;
    }
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // Mesmo erro para email errado e senha errada — não revela o que existe
    if (
      !user ||
      !user.isActive ||
      !(await bcrypt.compare(dto.password, user.password))
    ) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildAuthResponse(user);
  }

  async claimAccount(dto: ClaimAccountDto) {
    const tokenHash = crypto
      .createHash('sha256')
      .update(dto.token)
      .digest('hex');

    const user = await this.prisma.user.findUnique({
      where: { claimTokenHash: tokenHash },
    });

    if (
      !user ||
      !user.claimTokenExpiresAt ||
      user.claimTokenExpiresAt < new Date()
    ) {
      throw new UnauthorizedException('Link inválido ou expirado');
    }

    const hash = await bcrypt.hash(dto.password, 12);
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hash, claimTokenHash: null, claimTokenExpiresAt: null },
    });

    return this.buildAuthResponse(updated);
  }

  /**
   * Preview de identidade pro token de claim — NÃO consome o token (ao
   * contrário de claimAccount). Usado pra tela de Ativar conta mostrar quem
   * é antes de pedir a senha, e pra pegar link inválido/expirado ANTES do
   * submit em vez de só no erro do POST.
   */
  async getClaimPreview(token: string) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await this.prisma.user.findUnique({
      where: { claimTokenHash: tokenHash },
      include: {
        influencer: {
          include: {
            applications: {
              orderBy: { appliedAt: 'desc' },
              take: 1,
              include: { campaign: { select: { title: true } } },
            },
          },
        },
      },
    });

    if (
      !user ||
      !user.claimTokenExpiresAt ||
      user.claimTokenExpiresAt < new Date() ||
      !user.influencer
    ) {
      throw new UnauthorizedException('Link inválido ou expirado');
    }

    const latestApplication = user.influencer.applications[0];

    return {
      instagramHandle: user.influencer.instagramHandle,
      email: user.email,
      avatarUrl: user.influencer.avatarUrl,
      influencerId: user.influencer.id,
      hasIgAvatar: Boolean(user.influencer.igProfilePicUrl),
      campaignTitle: latestApplication?.campaign.title ?? null,
    };
  }

  /**
   * Emite token de recuperação de senha, se e-mail achar conta ativa. Sempre
   * resolve sem lançar — nunca revela pro chamador se o e-mail existe
   * (anti-enumeração): conta CLAIMABLE é tratada igual a qualquer outra.
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.isActive) return;

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetTokenHash: tokenHash, resetTokenExpiresAt: expiresAt },
    });

    const frontendUrl = this.config.getOrThrow<string>('FRONTEND_URL');
    try {
      await this.emailService.sendPasswordReset({
        to: user.email,
        resetUrl: `${frontendUrl}/reset-password?token=${rawToken}`,
      });
    } catch {
      // sendBestEffort do EmailService já engole falha do provider; este
      // catch é só uma segunda rede — o endpoint sempre responde OK.
    }
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = crypto
      .createHash('sha256')
      .update(dto.token)
      .digest('hex');

    const user = await this.prisma.user.findUnique({
      where: { resetTokenHash: tokenHash },
    });

    if (
      !user ||
      !user.resetTokenExpiresAt ||
      user.resetTokenExpiresAt < new Date()
    ) {
      throw new UnauthorizedException('Link inválido ou expirado');
    }

    const hash = await bcrypt.hash(dto.password, 12);
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hash, resetTokenHash: null, resetTokenExpiresAt: null },
    });

    return this.buildAuthResponse(updated);
  }

  /**
   * Troca de senha por quem já está autenticada — exige a senha atual
   * (diferente do reset: aqui a prova de identidade é a senha, não um
   * token de e-mail). Rotaciona a sessão: derruba qualquer outro
   * dispositivo logado, de graça, porque refreshTokenHash é único por
   * conta. Zera também o par de claim — trocar a senha conscientemente
   * encerra qualquer convite de claim ainda pendente pra essa conta.
   */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }

    if (!(await bcrypt.compare(dto.currentPassword, user.password))) {
      throw new UnauthorizedException('Senha atual incorreta');
    }

    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException('A nova senha deve ser diferente da atual');
    }

    const hash = await bcrypt.hash(dto.newPassword, 12);
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hash,
        resetTokenHash: null,
        resetTokenExpiresAt: null,
        claimTokenHash: null,
        claimTokenExpiresAt: null,
      },
    });

    return this.buildAuthResponse(updated);
  }

  async refreshTokens(userId: string, incomingToken: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive || !user.refreshTokenHash)
      throw new UnauthorizedException();

    const incomingHash = crypto
      .createHash('sha256')
      .update(incomingToken)
      .digest('hex');
    if (incomingHash !== user.refreshTokenHash)
      throw new UnauthorizedException();

    return this.buildAuthResponse(user);
  }

  async revokeRefreshToken(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
  }

  private async buildAuthResponse(user: AuthUser) {
    const accessToken = this.jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.getOrThrow<string>(
          'JWT_ACCESS_EXPIRES_IN',
        ) as any,
      },
    );

    const refreshToken = this.jwt.sign(
      { sub: user.id },
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.getOrThrow<string>(
          'JWT_REFRESH_EXPIRES_IN',
        ) as any,
      },
    );

    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: tokenHash },
    });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }
}
