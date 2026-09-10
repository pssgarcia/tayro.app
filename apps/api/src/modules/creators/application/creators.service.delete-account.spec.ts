import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { CreatorsService } from './creators.service';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { InstagramSyncService } from '../../instagram/instagram-sync.service';
import { EmailService } from '../../email/email.service';

describe('CreatorsService — deleteMyAccount (LGPD, D-22)', () => {
  let service: CreatorsService;
  let prisma: jest.Mocked<any>;
  let emailService: { sendAccountDeleted: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), update: jest.fn() },
      influencer: { findUnique: jest.fn(), update: jest.fn() },
      application: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      igImage: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };
    emailService = {
      sendAccountDeleted: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreatorsService,
        { provide: PrismaService, useValue: prisma },
        { provide: InstagramSyncService, useValue: { refresh: jest.fn() } },
        { provide: EmailService, useValue: emailService },
        { provide: ConfigService, useValue: { getOrThrow: jest.fn() } },
      ],
    }).compile();

    service = module.get(CreatorsService);
  });

  async function makeUser(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      id: 'user-1',
      email: 'ana@example.com',
      password: await bcrypt.hash('senhaAtual1', 12),
      isActive: true,
      ...overrides,
    };
  }

  const makeInfluencer = (
    overrides: Partial<Record<string, unknown>> = {},
  ) => ({
    id: 'inf-1',
    userId: 'user-1',
    name: 'Ana Silva',
    ...overrides,
  });

  it('senha incorreta lança 401 e não toca no banco', async () => {
    prisma.user.findUnique.mockResolvedValue(await makeUser());

    await expect(
      service.deleteMyAccount('user-1', { password: 'senhaErrada' }),
    ).rejects.toThrow(UnauthorizedException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(emailService.sendAccountDeleted).not.toHaveBeenCalled();
  });

  it('usuário inexistente ou inativo lança 401', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service.deleteMyAccount('user-x', { password: 'qualquer' }),
    ).rejects.toThrow(UnauthorizedException);

    prisma.user.findUnique.mockResolvedValue(
      await makeUser({ isActive: false }),
    );
    await expect(
      service.deleteMyAccount('user-1', { password: 'senhaAtual1' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('conta sem perfil de influencer lança 403', async () => {
    prisma.user.findUnique.mockResolvedValue(await makeUser());
    prisma.influencer.findUnique.mockResolvedValue(null);

    await expect(
      service.deleteMyAccount('user-1', { password: 'senhaAtual1' }),
    ).rejects.toThrow(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('retira candidaturas PENDING (sem tocar em APPROVED/REJECTED/WITHDRAWN)', async () => {
    prisma.user.findUnique.mockResolvedValue(await makeUser());
    prisma.influencer.findUnique.mockResolvedValue(makeInfluencer());
    prisma.influencer.update.mockResolvedValue(makeInfluencer());
    prisma.user.update.mockResolvedValue(await makeUser());

    await service.deleteMyAccount('user-1', { password: 'senhaAtual1' });

    expect(prisma.application.updateMany).toHaveBeenCalledWith({
      where: { influencerId: 'inf-1', status: 'PENDING' },
      data: { status: 'WITHDRAWN' },
    });
  });

  it('apaga as fotos cacheadas do Instagram (IgImage)', async () => {
    prisma.user.findUnique.mockResolvedValue(await makeUser());
    prisma.influencer.findUnique.mockResolvedValue(makeInfluencer());
    prisma.influencer.update.mockResolvedValue(makeInfluencer());
    prisma.user.update.mockResolvedValue(await makeUser());

    await service.deleteMyAccount('user-1', { password: 'senhaAtual1' });

    expect(prisma.igImage.deleteMany).toHaveBeenCalledWith({
      where: { influencerId: 'inf-1' },
    });
  });

  it('esvazia os campos de identidade do Influencer, mantendo o id', async () => {
    prisma.user.findUnique.mockResolvedValue(await makeUser());
    prisma.influencer.findUnique.mockResolvedValue(makeInfluencer());
    prisma.influencer.update.mockResolvedValue(makeInfluencer());
    prisma.user.update.mockResolvedValue(await makeUser());

    await service.deleteMyAccount('user-1', { password: 'senhaAtual1' });

    expect(prisma.influencer.update).toHaveBeenCalledWith({
      where: { id: 'inf-1' },
      data: expect.objectContaining({
        avatarUrl: null,
        bio: null,
        phone: null,
        tiktokHandle: null,
        instagramHandle: null,
        igProfilePicUrl: null,
        igRecentPosts: Prisma.DbNull,
        igFetchedAt: null,
        igFetchStatus: null,
        followersCount: null,
        igEngagementRate: null,
        niches: [],
        city: null,
        publicProfileEnabled: false,
      }),
    });
  });

  it('grava um e-mail tombstone único, desativa a conta e zera todos os tokens', async () => {
    prisma.user.findUnique.mockResolvedValue(await makeUser());
    prisma.influencer.findUnique.mockResolvedValue(makeInfluencer());
    prisma.influencer.update.mockResolvedValue(makeInfluencer());
    prisma.user.update.mockResolvedValue(await makeUser());

    await service.deleteMyAccount('user-1', { password: 'senhaAtual1' });

    const call = prisma.user.update.mock.calls[0][0];
    expect(call.where).toEqual({ id: 'user-1' });
    expect(call.data.email).toMatch(/^deleted-.+@tayro\.invalid$/);
    expect(call.data.isActive).toBe(false);
    expect(call.data.refreshTokenHash).toBeNull();
    expect(call.data.claimTokenHash).toBeNull();
    expect(call.data.claimTokenExpiresAt).toBeNull();
    expect(call.data.resetTokenHash).toBeNull();
    expect(call.data.resetTokenExpiresAt).toBeNull();
  });

  // O tombstone é gravado NA MESMA transação — se o e-mail de confirmação
  // fosse montado depois, capturando `user.email`/`influencer.name` do banco
  // outra vez, o aviso sairia pro endereço fantasma que ninguém lê.
  it('avisa o e-mail e o nome ORIGINAIS, não o tombstone', async () => {
    prisma.user.findUnique.mockResolvedValue(
      await makeUser({ email: 'ana-original@example.com' }),
    );
    prisma.influencer.findUnique.mockResolvedValue(
      makeInfluencer({ name: 'Ana Original' }),
    );
    prisma.influencer.update.mockResolvedValue(makeInfluencer());
    prisma.user.update.mockResolvedValue(await makeUser());

    await service.deleteMyAccount('user-1', { password: 'senhaAtual1' });

    expect(emailService.sendAccountDeleted).toHaveBeenCalledWith({
      to: 'ana-original@example.com',
      creatorName: 'Ana Original',
    });
  });

  // ─── Credencial e registro de aceite ──────────────────────────────────────

  it('destrói o hash da senha antiga (não basta desativar a conta)', async () => {
    const original = await makeUser();
    prisma.user.findUnique.mockResolvedValue(original);
    prisma.influencer.findUnique.mockResolvedValue(makeInfluencer());
    prisma.influencer.update.mockResolvedValue(makeInfluencer());
    prisma.user.update.mockResolvedValue(original);

    await service.deleteMyAccount('user-1', { password: 'senhaAtual1' });

    const gravado = prisma.user.update.mock.calls[0][0].data.password;
    // Continua sendo um hash bcrypt válido (a coluna é obrigatória e algum
    // caminho futuro pode chamar bcrypt.compare contra ela)...
    expect(gravado).toMatch(/^\$2[aby]\$/);
    // ...mas não é mais o hash da senha da pessoa...
    expect(gravado).not.toBe(original.password);
    // ...e a senha que ela usava não abre mais nada.
    await expect(bcrypt.compare('senhaAtual1', gravado)).resolves.toBe(false);
  });

  it('PRESERVA o registro de aceite dos documentos', async () => {
    prisma.user.findUnique.mockResolvedValue(await makeUser());
    prisma.influencer.findUnique.mockResolvedValue(makeInfluencer());
    prisma.influencer.update.mockResolvedValue(makeInfluencer());
    prisma.user.update.mockResolvedValue(await makeUser());

    await service.deleteMyAccount('user-1', { password: 'senhaAtual1' });

    // É prova de que a relação existiu sob determinada versão dos documentos
    // (uma versão e um horário, nada que identifique a pessoa). Apagar
    // destruiria o registro do acordo. Descrito na Política de Privacidade.
    const data = prisma.user.update.mock.calls[0][0].data;
    expect(data).not.toHaveProperty('acceptedTermsVersion');
    expect(data).not.toHaveProperty('acceptedPrivacyVersion');
    expect(data).not.toHaveProperty('acceptedAt');
    expect(data).not.toHaveProperty('declaredAdultAt');
  });

  it('desliga o perfil público na exclusão', async () => {
    prisma.user.findUnique.mockResolvedValue(await makeUser());
    prisma.influencer.findUnique.mockResolvedValue(makeInfluencer());
    prisma.influencer.update.mockResolvedValue(makeInfluencer());
    prisma.user.update.mockResolvedValue(await makeUser());

    await service.deleteMyAccount('user-1', { password: 'senhaAtual1' });

    expect(prisma.influencer.update.mock.calls[0][0].data).toMatchObject({
      publicProfileEnabled: false,
    });
  });
});
