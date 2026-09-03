import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { CreatorsService } from './creators.service';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { InstagramSyncService } from '../../instagram/instagram-sync.service';
import { EmailService } from '../../email/email.service';

const makeInfluencer = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'inf-1',
  name: 'Ana Silva',
  avatarUrl: null,
  bio: null,
  city: null,
  niches: ['fitness'],
  phone: null,
  instagramHandle: 'anafit',
  tiktokHandle: null,
  followersCount: 1000,
  igEngagementRate: 4.2,
  igFetchStatus: 'OK',
  publicProfileEnabled: false,
  createdAt: new Date('2026-01-01'),
  user: { email: 'ana@example.com' },
  ...overrides,
});

describe('CreatorsService — perfil (me)', () => {
  let service: CreatorsService;
  let prisma: jest.Mocked<any>;

  beforeEach(async () => {
    prisma = {
      influencer: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreatorsService,
        { provide: PrismaService, useValue: prisma },
        { provide: InstagramSyncService, useValue: { refresh: jest.fn() } },
        {
          provide: EmailService,
          useValue: {
            sendClaimAccount: jest.fn().mockResolvedValue(undefined),
          },
        },
        { provide: ConfigService, useValue: { getOrThrow: jest.fn() } },
      ],
    }).compile();

    service = module.get(CreatorsService);
  });

  // ─── getMe ──────────────────────────────────────────────────────────────────

  it('getMe achata o email e retorna o perfil', async () => {
    prisma.influencer.findUnique.mockResolvedValue(makeInfluencer());

    const result = await service.getMe('user-1');

    expect(result.email).toBe('ana@example.com');
    expect(result.instagramHandle).toBe('anafit');
    expect(result).not.toHaveProperty('user');
  });

  // O telefone é o canal que a aba Creators da marca usa (link tel: + botão de
  // WhatsApp). Sem ele no select, a creator não teria como ver nem editar o
  // que a marca vê.
  it('getMe devolve o telefone', async () => {
    prisma.influencer.findUnique.mockResolvedValue(
      makeInfluencer({ phone: '(11) 91234-5678' }),
    );

    const result = await service.getMe('user-1');

    expect(result.phone).toBe('(11) 91234-5678');
  });

  // A foto do TAYRO é a do Instagram (regra única em `creatorAvatarSrc` no
  // front). Sem `igProfilePicUrl` no SELECT, o Perfil da creator não tem como
  // mostrar a mesma foto que a marca vê na Fila: a placa dele prometia em
  // texto "é exatamente isso que a marca vê" e mostrava um quadrado vazio.
  //
  // A asserção é sobre o SELECT, não sobre o retorno: o mock devolve o objeto
  // inteiro ignorando o `select`, então um teste que olha o resultado passa
  // com o campo faltando de verdade. Foi o que aconteceu na 1ª versão deste
  // teste.
  it('getMe pede a foto do Instagram e o id que monta a URL do proxy', async () => {
    prisma.influencer.findUnique.mockResolvedValue(makeInfluencer());

    await service.getMe('user-1');

    const select = prisma.influencer.findUnique.mock.calls[0][0]
      .select as Record<string, unknown>;
    expect(select.igProfilePicUrl).toBe(true);
    expect(select.id).toBe(true);
  });

  it('getMe lança Forbidden quando o usuário não tem perfil de influencer', async () => {
    prisma.influencer.findUnique.mockResolvedValue(null);

    await expect(service.getMe('user-sem-perfil')).rejects.toThrow(
      ForbiddenException,
    );
  });

  // ─── updateMe ───────────────────────────────────────────────────────────────

  it('updateMe envia só os campos presentes (partial) e persiste o toggle LGPD', async () => {
    prisma.influencer.update.mockResolvedValue(makeInfluencer());
    prisma.influencer.findUnique.mockResolvedValue(
      makeInfluencer({ publicProfileEnabled: true, bio: 'Nova bio' }),
    );

    const result = await service.updateMe('user-1', {
      bio: 'Nova bio',
      publicProfileEnabled: true,
    });

    expect(prisma.influencer.update).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: { bio: 'Nova bio', publicProfileEnabled: true },
    });
    // não inclui campos não enviados
    expect(prisma.influencer.update.mock.calls[0][0].data).not.toHaveProperty(
      'name',
    );
    expect(result.publicProfileEnabled).toBe(true);
  });

  it('updateMe persiste o telefone', async () => {
    prisma.influencer.update.mockResolvedValue(makeInfluencer());
    prisma.influencer.findUnique.mockResolvedValue(
      makeInfluencer({ phone: '(21) 98888-7777' }),
    );

    const result = await service.updateMe('user-1', {
      phone: '(21) 98888-7777',
    });

    expect(prisma.influencer.update).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: { phone: '(21) 98888-7777' },
    });
    expect(result.phone).toBe('(21) 98888-7777');
  });

  // Apagar o campo é como a creator REMOVE o telefone. Guardar "" faria o
  // front (que decide por `phone == null`) renderizar um link tel: vazio na
  // placa da marca.
  it('updateMe grava null quando o telefone vem vazio', async () => {
    prisma.influencer.update.mockResolvedValue(makeInfluencer());
    prisma.influencer.findUnique.mockResolvedValue(makeInfluencer());

    await service.updateMe('user-1', { phone: '' });

    expect(prisma.influencer.update).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: { phone: null },
    });
  });

  it('updateMe traduz P2025 (registro inexistente) em Forbidden', async () => {
    prisma.influencer.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '6.19.3',
      }),
    );

    await expect(
      service.updateMe('user-sem-perfil', { name: 'X' }),
    ).rejects.toThrow(ForbiddenException);
  });
});
