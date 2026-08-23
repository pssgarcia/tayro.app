/**
 * ContentService — envio e revisão de conteúdo.
 *
 * `content.service.spec.ts` cobria só `findByCampaign`; os outros seis métodos
 * do serviço não tinham teste nenhum, incluindo o fluxo de revisão inteiro
 * (aprovar / recusar / pedir revisão) e o gate que exige candidatura APROVADA
 * antes de enviar conteúdo. O foco aqui é comportamento e gate de negócio, não
 * render — cada teste que rejeita também afirma que NADA foi escrito.
 */
import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ApplicationStatus, ContentStatus } from '@prisma/client';
import { ContentService } from './content.service';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';

const makeApplication = (overrides: Record<string, unknown> = {}) => ({
  id: 'app-1',
  influencerId: 'inf-1',
  status: ApplicationStatus.APPROVED,
  campaign: { brand: { userId: 'user-brand-1' } },
  influencer: { userId: 'user-creator-1' },
  ...overrides,
});

const makeSubmission = (overrides: Record<string, unknown> = {}) => ({
  id: 'sub-1',
  applicationId: 'app-1',
  status: ContentStatus.PENDING,
  application: {
    campaign: { brand: { userId: 'user-brand-1' } },
  },
  ...overrides,
});

describe('ContentService — envio e revisão', () => {
  let service: ContentService;
  let prisma: jest.Mocked<any>;

  beforeEach(async () => {
    prisma = {
      campaign: { findUnique: jest.fn() },
      influencer: { findUnique: jest.fn() },
      application: { findUnique: jest.fn() },
      contentSubmission: {
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ContentService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(ContentService);
  });

  // ─── submit ───────────────────────────────────────────────────────────────

  describe('submit', () => {
    const dto = {
      applicationId: 'app-1',
      mediaUrl: 'https://instagram.com/p/abc',
      mediaType: 'REEL' as const,
      caption: 'Treino da semana',
    };

    it('cria a submission quando a candidatura é da creator e está APROVADA', async () => {
      prisma.influencer.findUnique.mockResolvedValue({ id: 'inf-1' });
      prisma.application.findUnique.mockResolvedValue(makeApplication());
      prisma.contentSubmission.create.mockResolvedValue(makeSubmission());

      await service.submit('user-creator-1', dto);

      expect(prisma.contentSubmission.create).toHaveBeenCalledWith({
        data: {
          applicationId: 'app-1',
          mediaUrl: dto.mediaUrl,
          mediaType: dto.mediaType,
          caption: dto.caption,
        },
      });
    });

    // Este é o gate central da capacidade: sem candidatura aprovada, não há
    // conteúdo. Já mordeu em Recompensas por ninguém ter lido a validação real
    // antes de construir UI em cima.
    it.each([
      ApplicationStatus.PENDING,
      ApplicationStatus.REJECTED,
      ApplicationStatus.WITHDRAWN,
    ])('recusa envio com candidatura em %s — nada é criado', async (status) => {
      prisma.influencer.findUnique.mockResolvedValue({ id: 'inf-1' });
      prisma.application.findUnique.mockResolvedValue(
        makeApplication({ status }),
      );

      await expect(service.submit('user-creator-1', dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.contentSubmission.create).not.toHaveBeenCalled();
    });

    it('403 ao enviar conteúdo para candidatura de outra creator', async () => {
      prisma.influencer.findUnique.mockResolvedValue({ id: 'inf-2' });
      prisma.application.findUnique.mockResolvedValue(makeApplication());

      await expect(service.submit('user-creator-2', dto)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.contentSubmission.create).not.toHaveBeenCalled();
    });

    it('403 quando o usuário não tem perfil de creator', async () => {
      prisma.influencer.findUnique.mockResolvedValue(null);

      await expect(service.submit('user-sem-perfil', dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('404 quando a candidatura não existe', async () => {
      prisma.influencer.findUnique.mockResolvedValue({ id: 'inf-1' });
      prisma.application.findUnique.mockResolvedValue(null);

      await expect(service.submit('user-creator-1', dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── findMine ─────────────────────────────────────────────────────────────

  describe('findMine', () => {
    it('filtra pelas submissions da própria creator, mais recentes primeiro', async () => {
      prisma.influencer.findUnique.mockResolvedValue({ id: 'inf-1' });
      prisma.contentSubmission.findMany.mockResolvedValue([]);

      await service.findMine('user-creator-1');

      expect(prisma.contentSubmission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { application: { influencerId: 'inf-1' } },
          orderBy: { submittedAt: 'desc' },
        }),
      );
    });

    // Sem `include`, a listagem precisaria de uma query por submission só pra
    // saber de que campanha/marca ela é.
    it('traz campanha e marca na mesma query (sem N+1)', async () => {
      prisma.influencer.findUnique.mockResolvedValue({ id: 'inf-1' });
      prisma.contentSubmission.findMany.mockResolvedValue([]);

      await service.findMine('user-creator-1');

      const arg = prisma.contentSubmission.findMany.mock.calls[0][0];
      expect(arg.include.application.select.campaign).toBeDefined();
      expect(prisma.contentSubmission.findMany).toHaveBeenCalledTimes(1);
    });

    it('403 quando o usuário não tem perfil de creator', async () => {
      prisma.influencer.findUnique.mockResolvedValue(null);

      await expect(service.findMine('user-sem-perfil')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ─── findByApplication (ownership dupla) ──────────────────────────────────

  describe('findByApplication', () => {
    it('a creator dona da candidatura enxerga', async () => {
      prisma.application.findUnique.mockResolvedValue(makeApplication());
      prisma.contentSubmission.findMany.mockResolvedValue([]);

      await expect(
        service.findByApplication('app-1', 'user-creator-1'),
      ).resolves.toEqual([]);
    });

    it('a marca dona da campanha enxerga', async () => {
      prisma.application.findUnique.mockResolvedValue(makeApplication());
      prisma.contentSubmission.findMany.mockResolvedValue([]);

      await expect(
        service.findByApplication('app-1', 'user-brand-1'),
      ).resolves.toEqual([]);
    });

    it('403 para quem não é nenhum dos dois', async () => {
      prisma.application.findUnique.mockResolvedValue(makeApplication());

      await expect(
        service.findByApplication('app-1', 'estranho'),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.contentSubmission.findMany).not.toHaveBeenCalled();
    });

    it('404 quando a candidatura não existe', async () => {
      prisma.application.findUnique.mockResolvedValue(null);

      await expect(
        service.findByApplication('ghost', 'user-brand-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── Revisão pela marca ───────────────────────────────────────────────────

  describe.each([
    ['approve', ContentStatus.APPROVED],
    ['reject', ContentStatus.REJECTED],
  ] as const)('%s', (metodo, statusFinal) => {
    const chamar = (userId: string, feedback?: string) =>
      (
        service[metodo] as (
          id: string,
          u: string,
          dto: unknown,
        ) => Promise<unknown>
      )('sub-1', userId, { feedback });

    it(`transiciona PENDING → ${statusFinal} e carimba a data de revisão`, async () => {
      prisma.contentSubmission.findUnique.mockResolvedValue(makeSubmission());
      prisma.contentSubmission.update.mockResolvedValue(
        makeSubmission({ status: statusFinal }),
      );

      await chamar('user-brand-1', 'ficou ótimo');

      const arg = prisma.contentSubmission.update.mock.calls[0][0];
      expect(arg.where).toEqual({ id: 'sub-1' });
      expect(arg.data.status).toBe(statusFinal);
      expect(arg.data.feedback).toBe('ficou ótimo');
      expect(arg.data.reviewedAt).toBeInstanceOf(Date);
    });

    it('403 quando quem revisa não é a marca dona da campanha', async () => {
      prisma.contentSubmission.findUnique.mockResolvedValue(makeSubmission());

      await expect(chamar('outra-marca')).rejects.toThrow(ForbiddenException);
      expect(prisma.contentSubmission.update).not.toHaveBeenCalled();
    });

    it.each([
      ContentStatus.APPROVED,
      ContentStatus.REJECTED,
      ContentStatus.REVISION_REQUESTED,
    ])('400 ao revisar conteúdo já em %s — nada é escrito', async (status) => {
      prisma.contentSubmission.findUnique.mockResolvedValue(
        makeSubmission({ status }),
      );

      await expect(chamar('user-brand-1')).rejects.toThrow(BadRequestException);
      expect(prisma.contentSubmission.update).not.toHaveBeenCalled();
    });

    it('404 quando a submission não existe', async () => {
      prisma.contentSubmission.findUnique.mockResolvedValue(null);

      await expect(chamar('user-brand-1')).rejects.toThrow(NotFoundException);
    });
  });

  // Assimetria deliberada (ver specs/content-submissions → Behavior): recusar
  // não exige motivo, pedir revisão exige — sem o texto, a creator não saberia
  // o que refazer.
  describe('requestRevision', () => {
    const chamar = (userId: string, feedback?: string) =>
      service.requestRevision('sub-1', userId, { feedback });

    it('transiciona para REVISION_REQUESTED quando há feedback', async () => {
      prisma.contentSubmission.findUnique.mockResolvedValue(makeSubmission());
      prisma.contentSubmission.update.mockResolvedValue(
        makeSubmission({ status: ContentStatus.REVISION_REQUESTED }),
      );

      await chamar('user-brand-1', 'troca a legenda');

      expect(prisma.contentSubmission.update.mock.calls[0][0].data.status).toBe(
        ContentStatus.REVISION_REQUESTED,
      );
    });

    it.each([undefined, '', '   '])(
      'exige feedback — recusa com %p e não escreve nada',
      async (feedback) => {
        prisma.contentSubmission.findUnique.mockResolvedValue(makeSubmission());

        await expect(chamar('user-brand-1', feedback)).rejects.toThrow(
          BadRequestException,
        );
        expect(prisma.contentSubmission.update).not.toHaveBeenCalled();
      },
    );

    it('checa a posse da campanha antes de checar o feedback', async () => {
      prisma.contentSubmission.findUnique.mockResolvedValue(makeSubmission());

      await expect(chamar('outra-marca')).rejects.toThrow(ForbiddenException);
    });
  });
});
