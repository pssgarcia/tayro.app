/**
 * ApplicationsService — decisão única, retirada e refresh manual de Instagram.
 *
 * Complementa `applications.service.race.spec.ts` (que cobre maxSpots sob
 * concorrência). Aqui o alvo é outro: garantir que toda saída de PENDING é
 * condicional à linha AINDA estar pendente no instante da escrita, e cobrir
 * `withdraw`/`refreshInfluencerIg`, que não tinham teste nenhum.
 */
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApplicationStatus, Prisma } from '@prisma/client';
import { ApplicationsService } from './applications.service';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { InstagramSyncService } from '../../instagram/instagram-sync.service';
import { EmailService } from '../../email/email.service';

const makeApplication = (overrides: Record<string, unknown> = {}) => ({
  id: 'app-1',
  campaignId: 'camp-1',
  influencerId: 'inf-1',
  status: ApplicationStatus.PENDING,
  campaign: {
    title: 'Campanha Teste',
    maxSpots: 5,
    brand: { userId: 'brand-user-1', name: 'Marca Teste' },
  },
  influencer: {
    name: 'Creator Teste',
    user: { email: 'creator@example.com' },
  },
  ...overrides,
});

/** P2025 = "An operation failed because it depends on one or more records that
 * were required but not found" — é o que o Prisma devolve quando o WHERE
 * condicional (id + status) não casa nenhuma linha. */
const p2025 = () =>
  new Prisma.PrismaClientKnownRequestError('Record to update not found', {
    code: 'P2025',
    clientVersion: '6.19.3',
  });

describe('ApplicationsService — decisão única e retirada', () => {
  let service: ApplicationsService;
  let prisma: jest.Mocked<any>;
  let instagramSync: { refresh: jest.Mock };
  let emailService: {
    sendApplicationApproved: jest.Mock;
    sendApplicationRejected: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      influencer: { findUnique: jest.fn() },
      campaign: { findUnique: jest.fn() },
      application: {
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn(),
        findUnique: jest.fn(),
      },
      $transaction: jest.fn((arg: unknown) =>
        typeof arg === 'function'
          ? (arg as (tx: unknown) => unknown)(prisma)
          : Promise.all(arg as unknown[]),
      ),
    };

    instagramSync = { refresh: jest.fn().mockResolvedValue(undefined) };
    emailService = {
      sendApplicationApproved: jest.fn().mockResolvedValue(undefined),
      sendApplicationRejected: jest.fn().mockResolvedValue(undefined),
    };
    const config = { get: jest.fn().mockReturnValue('15') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: InstagramSyncService, useValue: instagramSync },
        { provide: ConfigService, useValue: config },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    service = module.get(ApplicationsService);
  });

  // ─── Escrita condicional ──────────────────────────────────────────────────

  describe('escrita condicional ao status PENDING', () => {
    it('approve filtra por status na escrita, não só por id', async () => {
      prisma.application.findUnique.mockResolvedValue(makeApplication());
      prisma.application.update.mockResolvedValue(
        makeApplication({ status: ApplicationStatus.APPROVED }),
      );

      await service.approve('app-1', 'brand-user-1');

      expect(prisma.application.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'app-1', status: ApplicationStatus.PENDING },
        }),
      );
    });

    it('reject filtra por status na escrita, não só por id', async () => {
      prisma.application.findUnique.mockResolvedValue(makeApplication());
      prisma.application.update.mockResolvedValue(
        makeApplication({ status: ApplicationStatus.REJECTED }),
      );

      await service.reject('app-1', 'brand-user-1');

      expect(prisma.application.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'app-1', status: ApplicationStatus.PENDING },
        }),
      );
    });

    it('withdraw filtra por status na escrita, não só por id', async () => {
      prisma.influencer.findUnique.mockResolvedValue({
        id: 'inf-1',
        userId: 'creator-user-1',
      });
      prisma.application.findUnique.mockResolvedValue(makeApplication());
      prisma.application.update.mockResolvedValue(
        makeApplication({ status: ApplicationStatus.WITHDRAWN }),
      );

      await service.withdraw('app-1', 'creator-user-1');

      expect(prisma.application.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'app-1', status: ApplicationStatus.PENDING },
        }),
      );
    });
  });

  // O cenário real: a marca aprova em um dispositivo e recusa em outro (ou a
  // requisição estourou o timeout e o cliente repetiu). As duas leram a linha
  // ainda PENDING; só uma pode vencer.
  describe('decisão concorrente (a linha já saiu de PENDING entre ler e escrever)', () => {
    it('reject perdedor vira 409 em vez de sobrescrever a aprovação', async () => {
      prisma.application.findUnique.mockResolvedValue(makeApplication());
      prisma.application.update.mockRejectedValue(p2025());

      await expect(service.reject('app-1', 'brand-user-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('reject perdedor NÃO envia e-mail de recusa', async () => {
      prisma.application.findUnique.mockResolvedValue(makeApplication());
      prisma.application.update.mockRejectedValue(p2025());

      await service.reject('app-1', 'brand-user-1').catch(() => undefined);

      expect(emailService.sendApplicationRejected).not.toHaveBeenCalled();
    });

    it('approve perdedor vira 409 e não envia e-mail de aprovação', async () => {
      prisma.application.findUnique.mockResolvedValue(makeApplication());
      prisma.application.update.mockRejectedValue(p2025());

      await expect(service.approve('app-1', 'brand-user-1')).rejects.toThrow(
        ConflictException,
      );
      expect(emailService.sendApplicationApproved).not.toHaveBeenCalled();
    });

    it('withdraw perdedor vira 409', async () => {
      prisma.influencer.findUnique.mockResolvedValue({
        id: 'inf-1',
        userId: 'creator-user-1',
      });
      prisma.application.findUnique.mockResolvedValue(makeApplication());
      prisma.application.update.mockRejectedValue(p2025());

      await expect(service.withdraw('app-1', 'creator-user-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('erro que não é P2025 continua propagando (não vira 409 genérico)', async () => {
      prisma.application.findUnique.mockResolvedValue(makeApplication());
      prisma.application.update.mockRejectedValue(new Error('connection lost'));

      await expect(service.reject('app-1', 'brand-user-1')).rejects.toThrow(
        'connection lost',
      );
    });
  });

  // ─── withdraw ─────────────────────────────────────────────────────────────

  describe('withdraw', () => {
    const influencer = { id: 'inf-1', userId: 'creator-user-1' };

    it('retira a própria candidatura pendente', async () => {
      prisma.influencer.findUnique.mockResolvedValue(influencer);
      prisma.application.findUnique.mockResolvedValue(makeApplication());
      prisma.application.update.mockResolvedValue(
        makeApplication({ status: ApplicationStatus.WITHDRAWN }),
      );

      const result = await service.withdraw('app-1', 'creator-user-1');

      expect(result.status).toBe(ApplicationStatus.WITHDRAWN);
    });

    it('403 ao tentar retirar candidatura de outra creator', async () => {
      prisma.influencer.findUnique.mockResolvedValue({
        id: 'inf-2',
        userId: 'outra-creator',
      });
      prisma.application.findUnique.mockResolvedValue(makeApplication());

      await expect(service.withdraw('app-1', 'outra-creator')).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.application.update).not.toHaveBeenCalled();
    });

    it('403 quando o usuário não tem perfil de creator', async () => {
      prisma.influencer.findUnique.mockResolvedValue(null);

      await expect(
        service.withdraw('app-1', 'user-sem-perfil'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('404 quando a candidatura não existe', async () => {
      prisma.influencer.findUnique.mockResolvedValue(influencer);
      prisma.application.findUnique.mockResolvedValue(null);

      await expect(service.withdraw('ghost', 'creator-user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it.each([
      ApplicationStatus.APPROVED,
      ApplicationStatus.REJECTED,
      ApplicationStatus.WITHDRAWN,
    ])(
      '400 ao retirar candidatura já em %s — nada é escrito',
      async (status) => {
        prisma.influencer.findUnique.mockResolvedValue(influencer);
        prisma.application.findUnique.mockResolvedValue(
          makeApplication({ status }),
        );

        await expect(
          service.withdraw('app-1', 'creator-user-1'),
        ).rejects.toThrow(BadRequestException);
        expect(prisma.application.update).not.toHaveBeenCalled();
      },
    );
  });

  // ─── refreshInfluencerIg ──────────────────────────────────────────────────
  // Cooldown existe pra não queimar cota de API externa paga por uso: TODA
  // tentativa carimba igFetchedAt, inclusive as que falharam.

  describe('refreshInfluencerIg', () => {
    const agora = new Date('2026-08-23T12:00:00.000Z');

    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(agora);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    const comUltimaTentativa = (minutosAtras: number | null) => {
      prisma.application.findUnique.mockResolvedValue(makeApplication());
      prisma.influencer.findUnique
        .mockResolvedValueOnce({
          id: 'inf-1',
          igFetchedAt:
            minutosAtras === null
              ? null
              : new Date(agora.getTime() - minutosAtras * 60_000),
        })
        .mockResolvedValueOnce({ id: 'inf-1', name: 'Creator Teste' });
    };

    it('dispara o refresh forçado quando nunca houve tentativa', async () => {
      comUltimaTentativa(null);

      await service.refreshInfluencerIg('app-1', 'brand-user-1');

      expect(instagramSync.refresh).toHaveBeenCalledWith('inf-1', {
        force: true,
      });
    });

    it('dispara o refresh quando o cooldown já passou', async () => {
      comUltimaTentativa(16);

      await service.refreshInfluencerIg('app-1', 'brand-user-1');

      expect(instagramSync.refresh).toHaveBeenCalled();
    });

    it('429 com waitMinutes quando ainda está no cooldown — não chama a API externa', async () => {
      comUltimaTentativa(3);

      const err = await service
        .refreshInfluencerIg('app-1', 'brand-user-1')
        .catch((e: unknown) => e);

      expect(err).toBeInstanceOf(HttpException);
      expect((err as HttpException).getStatus()).toBe(
        HttpStatus.TOO_MANY_REQUESTS,
      );
      expect((err as HttpException).getResponse()).toMatchObject({
        waitMinutes: 12,
      });
      expect(instagramSync.refresh).not.toHaveBeenCalled();
    });

    it('403 quando quem pede não é a marca dona da campanha', async () => {
      prisma.application.findUnique.mockResolvedValue(makeApplication());

      await expect(
        service.refreshInfluencerIg('app-1', 'outra-marca'),
      ).rejects.toThrow(ForbiddenException);
      expect(instagramSync.refresh).not.toHaveBeenCalled();
    });

    it('404 quando a influencer da candidatura não existe mais', async () => {
      prisma.application.findUnique.mockResolvedValue(makeApplication());
      prisma.influencer.findUnique.mockResolvedValue(null);

      await expect(
        service.refreshInfluencerIg('app-1', 'brand-user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
