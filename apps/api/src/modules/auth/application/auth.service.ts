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
import { IgFetchStatus, IgImageKind, Prisma, UserRole } from '@prisma/client';
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
import { ChangeEmailDto } from './dtos/change-email.dto';
import { legalAcceptanceFields } from '../../../shared/legal/legal-documents';
import { IgImageService } from '../../instagram/ig-image.service';

/**
 * Teto pra embutir a foto de perfil na prévia do claim. Foto de perfil do
 * Instagram fica na casa das dezenas de KB; acima disto o custo em base64
 * (+33%) num corpo JSON não se justifica e a tela cai nas iniciais.
 */
const CLAIM_AVATAR_MAX_BYTES = 256_000;

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
    private readonly igImages: IgImageService,
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
          // Gravado no mesmo create que a conta: aceite e conta nascem juntos,
          // sem janela em que exista conta sem registro de aceite.
          ...legalAcceptanceFields(),
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
          ...legalAcceptanceFields(),
          influencer: {
            create: {
              name: dto.name,
              phone: dto.phone,
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
      // A foto vai EMBUTIDA aqui, não como URL para /ig/avatar/:id.
      //
      // Esta tela é o único lugar do produto que mostra a foto da creator sem
      // sessão nenhuma (ela ainda não tem senha) e com o perfil público
      // desligado (é o default). Enquanto /ig/avatar era irrestrito isso
      // funcionava de graça; agora que ele exige autorização, a autorização
      // desta tela é o próprio token de claim, que já validamos acima. Servir
      // por aqui evita abrir um segundo endereço público só para este caso.
      igAvatarDataUri: await this.loadClaimAvatar(user.influencer.id),
      campaignTitle: latestApplication?.campaign.title ?? null,
    };
  }

  /**
   * Foto de perfil guardada, como data URI. `null` quando não temos imagem,
   * quando ela é grande demais para embutir, ou em qualquer falha: a prévia
   * não pode deixar de funcionar por causa de uma foto (a tela cai nas
   * iniciais, como em toda outra superfície do produto).
   */
  private async loadClaimAvatar(influencerId: string): Promise<string | null> {
    try {
      const influencer = await this.prisma.influencer.findUnique({
        where: { id: influencerId },
        select: { igProfilePicUrl: true },
      });

      const image = await this.igImages.findOrBackfill(
        influencerId,
        IgImageKind.PROFILE,
        0,
        influencer?.igProfilePicUrl,
      );
      if (!image || image.data.byteLength > CLAIM_AVATAR_MAX_BYTES) return null;

      return `data:${image.mimeType};base64,${image.data.toString('base64')}`;
    } catch {
      return null;
    }
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

  /**
   * Consumir um reset zera também o par de claim (não só o de reset) — achado
   * no /review de 2026-09-02: uma conta CLAIMABLE que resetasse a senha por
   * e-mail em vez de clicar no link de claim original deixava esse link
   * (válido por 7 dias) ainda funcional depois, permitindo a quem tivesse
   * acesso àquele primeiro e-mail definir uma senha nova por conta própria.
   * Mesma limpeza que changePassword já faz.
   */
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

  /**
   * Troca de e-mail por quem já está autenticada — exige a senha atual
   * (mesma prova de identidade do changePassword). Sem check-then-act: a
   * constraint @unique de email é a única fonte de verdade, mesmo padrão de
   * registerBrand/registerInfluencer. Avisa o e-mail ANTIGO da troca
   * (best-effort) e reemite sessão — o access token carrega email no
   * payload, então sem reemitir o front mostraria o e-mail velho por até
   * JWT_ACCESS_EXPIRES_IN.
   */
  async changeEmail(userId: string, dto: ChangeEmailDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }

    if (!(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Senha incorreta');
    }

    if (dto.email === user.email) {
      throw new BadRequestException('Este já é o seu e-mail');
    }

    const oldEmail = user.email;

    let updated;
    try {
      updated = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          email: dto.email,
          resetTokenHash: null,
          resetTokenExpiresAt: null,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException({
          statusCode: 409,
          error: 'Conflict',
          message: 'Este e-mail já está em uso',
          field: 'email',
        });
      }
      throw err;
    }

    try {
      await this.emailService.sendEmailChanged({
        to: oldEmail,
        newEmail: dto.email,
      });
    } catch {
      // sendBestEffort do EmailService já engole falha do provider; este
      // catch é só uma segunda rede — a troca já foi gravada e não pode
      // ser desfeita por causa de um e-mail que não saiu.
    }

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
