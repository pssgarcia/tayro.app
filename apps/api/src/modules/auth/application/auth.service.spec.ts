import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { Prisma, UserRole } from '@prisma/client';
import { AuthService } from './auth.service';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';

const makeUser = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'user-abc',
  email: 'creator@example.com',
  password: 'hashed',
  role: UserRole.BRAND,
  isActive: true,
  refreshTokenHash: null,
  ...overrides,
});

describe('AuthService', () => {
  let service: AuthService;
  let prisma: jest.Mocked<any>;
  let jwt: jest.Mocked<JwtService>;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    jwt = { sign: jest.fn().mockReturnValue('mocked-token') } as any;

    const config = {
      getOrThrow: jest.fn().mockReturnValue('test-secret'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  // ─── login ────────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('returns access and refresh tokens for valid credentials', async () => {
      const hash = await bcrypt.hash('secret123', 12);
      const user = makeUser({ password: hash });

      prisma.user.findUnique.mockResolvedValue(user);
      prisma.user.update.mockResolvedValue(user);

      const result = await service.login({
        email: user.email,
        password: 'secret123',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(user.email);
    });

    it('throws UnauthorizedException for wrong password', async () => {
      const hash = await bcrypt.hash('correct', 12);
      prisma.user.findUnique.mockResolvedValue(makeUser({ password: hash }));

      await expect(
        service.login({ email: 'creator@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for unknown email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'ghost@example.com', password: 'any' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for inactive account', async () => {
      const hash = await bcrypt.hash('pass', 12);
      prisma.user.findUnique.mockResolvedValue(
        makeUser({ password: hash, isActive: false }),
      );

      await expect(
        service.login({ email: 'creator@example.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── refreshTokens ────────────────────────────────────────────────────────────

  describe('refreshTokens', () => {
    it('issues new tokens and rotates hash when incoming token matches', async () => {
      const token = 'valid-refresh-token';
      const hash = crypto.createHash('sha256').update(token).digest('hex');
      const user = makeUser({ refreshTokenHash: hash });

      prisma.user.findUnique.mockResolvedValue(user);
      prisma.user.update.mockResolvedValue(user);

      const result = await service.refreshTokens(user.id, token);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      // Rotation: nova hash deve ser gravada no banco
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            refreshTokenHash: expect.any(String),
          }),
        }),
      );
    });

    it('throws UnauthorizedException when token is tampered', async () => {
      const user = makeUser({ refreshTokenHash: 'some-stored-hash' });
      prisma.user.findUnique.mockResolvedValue(user);

      await expect(
        service.refreshTokens(user.id, 'tampered-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when no hash stored (never logged in / logged out)', async () => {
      prisma.user.findUnique.mockResolvedValue(
        makeUser({ refreshTokenHash: null }),
      );

      await expect(
        service.refreshTokens('user-abc', 'any-token'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── claimAccount ─────────────────────────────────────────────────────────────

  describe('claimAccount', () => {
    it('define a senha, zera o claimToken e retorna tokens (auto-login)', async () => {
      const rawToken = 'raw-claim-token';
      const tokenHash = crypto
        .createHash('sha256')
        .update(rawToken)
        .digest('hex');
      const futureDate = new Date(Date.now() + 60_000);
      const user = makeUser({
        role: UserRole.INFLUENCER,
        claimTokenHash: tokenHash,
        claimTokenExpiresAt: futureDate,
      });

      prisma.user.findUnique.mockResolvedValue(user);
      prisma.user.update.mockResolvedValue(user);

      const result = await service.claimAccount({
        token: rawToken,
        password: 'novaSenhaSegura1',
      });

      expect(result).toHaveProperty('accessToken');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { claimTokenHash: tokenHash },
      });
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: user.id },
          data: expect.objectContaining({
            claimTokenHash: null,
            claimTokenExpiresAt: null,
          }),
        }),
      );
    });

    it('lança UnauthorizedException quando o token não existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.claimAccount({
          token: 'inexistente',
          password: 'senhaSegura1',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lança UnauthorizedException quando o token expirou', async () => {
      const rawToken = 'raw-claim-token';
      const tokenHash = crypto
        .createHash('sha256')
        .update(rawToken)
        .digest('hex');
      const pastDate = new Date(Date.now() - 60_000);

      prisma.user.findUnique.mockResolvedValue(
        makeUser({ claimTokenHash: tokenHash, claimTokenExpiresAt: pastDate }),
      );

      await expect(
        service.claimAccount({ token: rawToken, password: 'senhaSegura1' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── revokeRefreshToken ───────────────────────────────────────────────────────

  describe('revokeRefreshToken', () => {
    it('sets refreshTokenHash to null in the database', async () => {
      prisma.user.update.mockResolvedValue(makeUser());

      await service.revokeRefreshToken('user-abc');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-abc' },
        data: { refreshTokenHash: null },
      });
    });
  });

  // ─── registerBrand ────────────────────────────────────────────────────────────

  describe('registerBrand', () => {
    it('throws ConflictException when email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());

      await expect(
        service.registerBrand({
          email: 'creator@example.com',
          password: 'pass',
          brandName: 'Lilo',
          niches: [],
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── registerInfluencer ─────────────────────────────────────────────────────────

  describe('registerInfluencer', () => {
    const dto = {
      email: 'ana@example.com',
      password: 'senhaSegura1',
      name: 'Ana Silva',
      instagramHandle: 'anafit',
      niches: [],
    };

    const p2002 = (target: string) =>
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '6.19.3',
        meta: { target },
      });

    it('creates the influencer and returns tokens on success', async () => {
      prisma.user.create.mockResolvedValue(
        makeUser({ role: UserRole.INFLUENCER }),
      );
      prisma.user.update.mockResolvedValue(makeUser());

      const result = await service.registerInfluencer(dto);

      expect(result).toHaveProperty('accessToken');
      expect(result.user.role).toBe(UserRole.INFLUENCER);
    });

    it('throws ConflictException with field=instagramHandle when handle is taken', async () => {
      prisma.user.create.mockRejectedValue(
        p2002('Influencer_instagramHandle_key'),
      );

      const err = await service
        .registerInfluencer(dto)
        .catch((e: unknown) => e);

      expect(err).toBeInstanceOf(ConflictException);
      expect((err as ConflictException).getResponse()).toMatchObject({
        field: 'instagramHandle',
      });
    });

    it('throws ConflictException with field=email when email is taken', async () => {
      prisma.user.create.mockRejectedValue(p2002('User_email_key'));

      const err = await service
        .registerInfluencer(dto)
        .catch((e: unknown) => e);

      expect(err).toBeInstanceOf(ConflictException);
      expect((err as ConflictException).getResponse()).toMatchObject({
        field: 'email',
      });
    });
  });
});
