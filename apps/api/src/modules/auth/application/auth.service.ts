import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { RegisterBrandDto } from './dtos/register-brand.dto';
import { RegisterInfluencerDto } from './dtos/register-influencer.dto';
import { LoginDto } from './dtos/login.dto';
import { ClaimAccountDto } from './dtos/claim-account.dto';

type AuthUser = { id: string; email: string; role: UserRole };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async registerBrand(dto: RegisterBrandDto) {
    await this.assertEmailAvailable(dto.email);

    const hash = await bcrypt.hash(dto.password, 12);
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

  private async assertEmailAvailable(email: string) {
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new ConflictException('Email already in use');
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
