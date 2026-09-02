import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { IgFetchStatus, Prisma, UserRole } from '@prisma/client';
import { AuthService } from './auth.service';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { InstagramSyncService } from '../../instagram/instagram-sync.service';
import { EmailService } from '../../email/email.service';

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
  let scheduleRefresh: jest.Mock;
  let sendPasswordReset: jest.Mock;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    jwt = { sign: jest.fn().mockReturnValue('mocked-token') } as any;
    scheduleRefresh = jest.fn();
    sendPasswordReset = jest.fn().mockResolvedValue(undefined);

    const config = {
      getOrThrow: jest.fn().mockReturnValue('test-secret'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: config },
        { provide: InstagramSyncService, useValue: { scheduleRefresh } },
        { provide: EmailService, useValue: { sendPasswordReset } },
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

  // ─── getClaimPreview ──────────────────────────────────────────────────────────

  describe('getClaimPreview', () => {
    it('retorna a identidade (handle, e-mail, avatar, campanha) sem consumir o token', async () => {
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
        influencer: {
          id: 'inf-1',
          instagramHandle: 'thaismoreira',
          avatarUrl: null,
          igProfilePicUrl: 'https://scontent.cdninstagram.com/pic.jpg',
          applications: [{ campaign: { title: 'Basic Drop 2026' } }],
        },
      });

      prisma.user.findUnique.mockResolvedValue(user);

      const result = await service.getClaimPreview(rawToken);

      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { claimTokenHash: tokenHash } }),
      );
      expect(result).toEqual({
        instagramHandle: 'thaismoreira',
        email: user.email,
        avatarUrl: null,
        influencerId: 'inf-1',
        hasIgAvatar: true,
        campaignTitle: 'Basic Drop 2026',
      });
    });

    it('campaignTitle é null quando a creator ainda não tem nenhuma candidatura', async () => {
      const rawToken = 'raw-claim-token';
      const tokenHash = crypto
        .createHash('sha256')
        .update(rawToken)
        .digest('hex');
      const futureDate = new Date(Date.now() + 60_000);
      prisma.user.findUnique.mockResolvedValue(
        makeUser({
          role: UserRole.INFLUENCER,
          claimTokenHash: tokenHash,
          claimTokenExpiresAt: futureDate,
          influencer: {
            id: 'inf-1',
            instagramHandle: 'thaismoreira',
            avatarUrl: null,
            igProfilePicUrl: null,
            applications: [],
          },
        }),
      );

      const result = await service.getClaimPreview(rawToken);

      expect(result.campaignTitle).toBeNull();
      expect(result.hasIgAvatar).toBe(false);
    });

    it('lança UnauthorizedException quando o token não existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getClaimPreview('inexistente')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('lança UnauthorizedException quando o token expirou', async () => {
      const rawToken = 'raw-claim-token';
      const tokenHash = crypto
        .createHash('sha256')
        .update(rawToken)
        .digest('hex');
      const pastDate = new Date(Date.now() - 60_000);

      prisma.user.findUnique.mockResolvedValue(
        makeUser({
          claimTokenHash: tokenHash,
          claimTokenExpiresAt: pastDate,
          influencer: { id: 'inf-1', applications: [] },
        }),
      );

      await expect(service.getClaimPreview(rawToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ─── forgotPassword ───────────────────────────────────────────────────────────

  describe('forgotPassword', () => {
    it('para e-mail desconhecido, não escreve no banco nem manda e-mail (anti-enumeração)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await service.forgotPassword({ email: 'fantasma@example.com' });

      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(sendPasswordReset).not.toHaveBeenCalled();
    });

    it('para conta desativada, não escreve no banco nem manda e-mail (mesmo tratamento de e-mail desconhecido)', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser({ isActive: false }));

      await service.forgotPassword({ email: 'creator@example.com' });

      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(sendPasswordReset).not.toHaveBeenCalled();
    });

    it('para usuário ativo existente, gera e grava o par resetToken e manda o e-mail com a URL', async () => {
      const user = makeUser();
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.user.update.mockResolvedValue(user);

      await service.forgotPassword({ email: user.email });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: user.id },
          data: expect.objectContaining({
            resetTokenHash: expect.stringMatching(/^[0-9a-f]{64}$/),
            resetTokenExpiresAt: expect.any(Date),
          }),
        }),
      );

      const { resetTokenExpiresAt } = prisma.user.update.mock.calls[0][0].data;
      const deltaMs = resetTokenExpiresAt.getTime() - Date.now();
      expect(deltaMs).toBeGreaterThan(55 * 60 * 1000); // ~1h, com folga
      expect(deltaMs).toBeLessThanOrEqual(60 * 60 * 1000);

      expect(sendPasswordReset).toHaveBeenCalledWith(
        expect.objectContaining({
          to: user.email,
          resetUrl: expect.stringContaining('/reset-password?token='),
        }),
      );
    });

    it('nunca lança, mesmo se o envio do e-mail falhar (best-effort)', async () => {
      const user = makeUser();
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.user.update.mockResolvedValue(user);
      sendPasswordReset.mockRejectedValueOnce(new Error('Resend fora do ar'));

      await expect(
        service.forgotPassword({ email: user.email }),
      ).resolves.toBeUndefined();
    });
  });

  // ─── resetPassword ────────────────────────────────────────────────────────────

  describe('resetPassword', () => {
    it('define a nova senha, zera o resetToken e retorna tokens (auto-login)', async () => {
      const rawToken = 'raw-reset-token';
      const tokenHash = crypto
        .createHash('sha256')
        .update(rawToken)
        .digest('hex');
      const futureDate = new Date(Date.now() + 60_000);
      const user = makeUser({
        resetTokenHash: tokenHash,
        resetTokenExpiresAt: futureDate,
      });

      prisma.user.findUnique.mockResolvedValue(user);
      prisma.user.update.mockResolvedValue(user);

      const result = await service.resetPassword({
        token: rawToken,
        password: 'novaSenhaSegura1',
      });

      expect(result).toHaveProperty('accessToken');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { resetTokenHash: tokenHash },
      });
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: user.id },
          data: expect.objectContaining({
            resetTokenHash: null,
            resetTokenExpiresAt: null,
          }),
        }),
      );
    });

    it('lança UnauthorizedException quando o token não existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.resetPassword({
          token: 'inexistente',
          password: 'senhaSegura1',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lança UnauthorizedException quando o token expirou', async () => {
      const rawToken = 'raw-reset-token';
      const tokenHash = crypto
        .createHash('sha256')
        .update(rawToken)
        .digest('hex');
      const pastDate = new Date(Date.now() - 60_000);

      prisma.user.findUnique.mockResolvedValue(
        makeUser({ resetTokenHash: tokenHash, resetTokenExpiresAt: pastDate }),
      );

      await expect(
        service.resetPassword({ token: rawToken, password: 'senhaSegura1' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── changePassword ───────────────────────────────────────────────────────────

  describe('changePassword', () => {
    it('senha atual correta grava a nova senha (hash, nunca texto puro) e retorna tokens', async () => {
      const currentHash = await bcrypt.hash('senhaAtual1', 12);
      const user = makeUser({ password: currentHash });
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.user.update.mockResolvedValue(user);

      const result = await service.changePassword(user.id, {
        currentPassword: 'senhaAtual1',
        newPassword: 'senhaNova2',
      });

      expect(result).toHaveProperty('accessToken');
      const firstUpdateData = prisma.user.update.mock.calls[0][0].data;
      expect(firstUpdateData.password).not.toBe('senhaNova2');
      expect(await bcrypt.compare('senhaNova2', firstUpdateData.password)).toBe(
        true,
      );
    });

    it('zera o par de reset e o de claim no mesmo update — troca consciente encerra links pendentes', async () => {
      const currentHash = await bcrypt.hash('senhaAtual1', 12);
      const user = makeUser({ password: currentHash });
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.user.update.mockResolvedValue(user);

      await service.changePassword(user.id, {
        currentPassword: 'senhaAtual1',
        newPassword: 'senhaNova2',
      });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: user.id },
          data: expect.objectContaining({
            resetTokenHash: null,
            resetTokenExpiresAt: null,
            claimTokenHash: null,
            claimTokenExpiresAt: null,
          }),
        }),
      );
    });

    it('rotaciona o refreshTokenHash — deixa outros dispositivos deslogados', async () => {
      const currentHash = await bcrypt.hash('senhaAtual1', 12);
      const user = makeUser({
        password: currentHash,
        refreshTokenHash: 'hash-do-dispositivo-antigo',
      });
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.user.update.mockResolvedValue(user);

      await service.changePassword(user.id, {
        currentPassword: 'senhaAtual1',
        newPassword: 'senhaNova2',
      });

      // 2º update é o do buildAuthResponse, gravando o novo refreshTokenHash
      const sessionUpdateData = prisma.user.update.mock.calls[1][0].data;
      expect(sessionUpdateData.refreshTokenHash).not.toBe(
        'hash-do-dispositivo-antigo',
      );
    });

    it('senha atual incorreta lança UnauthorizedException e não grava nada', async () => {
      const currentHash = await bcrypt.hash('senhaAtual1', 12);
      prisma.user.findUnique.mockResolvedValue(
        makeUser({ password: currentHash }),
      );

      await expect(
        service.changePassword('user-abc', {
          currentPassword: 'senhaErrada',
          newPassword: 'senhaNova2',
        }),
      ).rejects.toThrow(UnauthorizedException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('usuário inexistente lança UnauthorizedException', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.changePassword('ghost', {
          currentPassword: 'qualquer',
          newPassword: 'senhaNova2',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('conta desativada lança UnauthorizedException', async () => {
      const currentHash = await bcrypt.hash('senhaAtual1', 12);
      prisma.user.findUnique.mockResolvedValue(
        makeUser({ password: currentHash, isActive: false }),
      );

      await expect(
        service.changePassword('user-abc', {
          currentPassword: 'senhaAtual1',
          newPassword: 'senhaNova2',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('nova senha igual à atual lança BadRequestException e não grava nada', async () => {
      const currentHash = await bcrypt.hash('senhaAtual1', 12);
      prisma.user.findUnique.mockResolvedValue(
        makeUser({ password: currentHash }),
      );

      await expect(
        service.changePassword('user-abc', {
          currentPassword: 'senhaAtual1',
          newPassword: 'senhaAtual1',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.user.update).not.toHaveBeenCalled();
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
    const dto = {
      email: 'marca@example.com',
      password: 'senhaSegura1',
      brandName: 'Lilo',
      niches: [],
    };

    const p2002 = () =>
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '6.19.3',
        meta: { target: 'User_email_key' },
      });

    it('creates the brand and returns tokens on success', async () => {
      prisma.user.create.mockResolvedValue(makeUser({ role: UserRole.BRAND }));
      prisma.user.update.mockResolvedValue(makeUser());

      const result = await service.registerBrand(dto);

      expect(result).toHaveProperty('accessToken');
      expect(result.user.role).toBe(UserRole.BRAND);
    });

    // Regressão: até 2026-08-23 este fluxo fazia findUnique antes do create
    // (check-then-act). Entre a consulta e a escrita cabia um segundo
    // cadastro com o mesmo e-mail — e o P2002 resultante não era tratado,
    // virando 500 genérico. Agora a constraint @unique é a única fonte de
    // verdade, como no cadastro de creator.
    it('throws ConflictException with field=email when the unique constraint fires', async () => {
      prisma.user.create.mockRejectedValue(p2002());

      const err = await service.registerBrand(dto).catch((e: unknown) => e);

      expect(err).toBeInstanceOf(ConflictException);
      expect((err as ConflictException).getResponse()).toMatchObject({
        statusCode: 409,
        field: 'email',
      });
    });

    it('does not consult the database before creating (no check-then-act)', async () => {
      prisma.user.create.mockResolvedValue(makeUser({ role: UserRole.BRAND }));
      prisma.user.update.mockResolvedValue(makeUser());

      await service.registerBrand(dto);

      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('propagates a non-P2002 error instead of masking it as 409', async () => {
      prisma.user.create.mockRejectedValue(new Error('connection lost'));

      await expect(service.registerBrand(dto)).rejects.toThrow(
        'connection lost',
      );
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

    // ─── Sync do Instagram ─────────────────────────────────────────────────
    // Até 2026-08-24 este caminho não marcava status nem disparava busca:
    // a creator que se cadastrava com senha nascia com igFetchStatus = null e
    // a marca via "Dados do Instagram indisponíveis" para sempre, porque o
    // front trata null igual a falha. Só a candidatura pública sincronizava.

    it('nasce com igFetchStatus PENDING', async () => {
      prisma.user.create.mockResolvedValue(
        makeUser({ role: UserRole.INFLUENCER, influencer: { id: 'inf-1' } }),
      );
      prisma.user.update.mockResolvedValue(makeUser());

      await service.registerInfluencer(dto);

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            influencer: expect.objectContaining({
              create: expect.objectContaining({
                igFetchStatus: IgFetchStatus.PENDING,
              }),
            }),
          }),
        }),
      );
    });

    it('agenda a busca do Instagram do influencer recém-criado', async () => {
      prisma.user.create.mockResolvedValue(
        makeUser({ role: UserRole.INFLUENCER, influencer: { id: 'inf-1' } }),
      );
      prisma.user.update.mockResolvedValue(makeUser());

      await service.registerInfluencer(dto);

      expect(scheduleRefresh).toHaveBeenCalledWith('inf-1');
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
