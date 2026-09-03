import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ApplicationStatus, Prisma } from '@prisma/client';
import { PartnershipResultsService } from './partnership-results.service';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { EmailService } from '../../email/email.service';

// ─── Fábricas ────────────────────────────────────────────────────────────────

const makeApplication = (o: Record<string, unknown> = {}) => ({
  id: 'app-1',
  status: ApplicationStatus.APPROVED,
  influencerId: 'inf-1',
  campaign: {
    id: 'camp-1',
    title: 'Campanha de Verão',
    brand: { id: 'brand-1', userId: 'user-brand-1', name: 'Lilo Suplementos' },
  },
  influencer: {
    id: 'inf-1',
    name: 'Ana Fitness',
    user: { email: 'ana@example.com' },
  },
  ...o,
});

const makeResult = (o: Record<string, unknown> = {}) => ({
  id: 'res-1',
  applicationId: 'app-1',
  reach: 12400,
  impressions: null,
  couponsUsed: 37,
  note: null,
  brandAllowsPublic: false,
  hiddenByCreator: false,
  createdAt: new Date('2026-09-01'),
  updatedAt: new Date('2026-09-01'),
  ...o,
});

const p2002 = () =>
  new Prisma.PrismaClientKnownRequestError('unique', {
    code: 'P2002',
    clientVersion: '5',
  });

describe('PartnershipResultsService', () => {
  let service: PartnershipResultsService;
  let prisma: jest.Mocked<any>;
  let email: { sendPartnershipResult: jest.Mock };

  beforeEach(async () => {
    prisma = {
      brand: { findUnique: jest.fn() },
      influencer: { findUnique: jest.fn() },
      campaign: { findUnique: jest.fn() },
      application: { findUnique: jest.fn(), findMany: jest.fn() },
      partnershipResult: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
    };
    email = { sendPartnershipResult: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartnershipResultsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: email },
      ],
    }).compile();

    service = module.get(PartnershipResultsService);
  });

  // ─── create ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    const dto = { applicationId: 'app-1', reach: 12400, couponsUsed: 37 };

    it('registra o resultado de uma candidatura aprovada da própria campanha', async () => {
      prisma.application.findUnique.mockResolvedValue(makeApplication());
      prisma.partnershipResult.create.mockResolvedValue(makeResult());

      const result = await service.create('user-brand-1', dto);

      expect(result.id).toBe('res-1');
      expect(prisma.partnershipResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          applicationId: 'app-1',
          reach: 12400,
          couponsUsed: 37,
        }),
      });
    });

    it('não publica no perfil da creator sem escolha ativa da marca', async () => {
      prisma.application.findUnique.mockResolvedValue(makeApplication());
      prisma.partnershipResult.create.mockResolvedValue(makeResult());

      await service.create('user-brand-1', dto);

      expect(prisma.partnershipResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ brandAllowsPublic: false }),
      });
    });

    it('respeita o consentimento de publicação quando a marca marca a caixa', async () => {
      prisma.application.findUnique.mockResolvedValue(makeApplication());
      prisma.partnershipResult.create.mockResolvedValue(makeResult());

      await service.create('user-brand-1', { ...dto, brandAllowsPublic: true });

      expect(prisma.partnershipResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ brandAllowsPublic: true }),
      });
    });

    it('avisa a creator por e-mail — registrar resultado é devolvê-lo a ela', async () => {
      prisma.application.findUnique.mockResolvedValue(makeApplication());
      prisma.partnershipResult.create.mockResolvedValue(makeResult());

      await service.create('user-brand-1', dto);

      expect(email.sendPartnershipResult).toHaveBeenCalledWith({
        to: 'ana@example.com',
        creatorName: 'Ana Fitness',
        campaignTitle: 'Campanha de Verão',
        brandName: 'Lilo Suplementos',
      });
    });

    it('falha de e-mail não derruba o registro do resultado', async () => {
      prisma.application.findUnique.mockResolvedValue(makeApplication());
      prisma.partnershipResult.create.mockResolvedValue(makeResult());
      email.sendPartnershipResult.mockRejectedValue(new Error('SMTP fora'));

      await expect(service.create('user-brand-1', dto)).resolves.toMatchObject({
        id: 'res-1',
      });
    });

    it('grava nota vazia como null — nunca string vazia', async () => {
      prisma.application.findUnique.mockResolvedValue(makeApplication());
      prisma.partnershipResult.create.mockResolvedValue(makeResult());

      await service.create('user-brand-1', { ...dto, note: '   ' });

      expect(prisma.partnershipResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ note: null }),
      });
    });

    it('recusa resultado sem número nem observação — registro vazio não é resultado', async () => {
      prisma.application.findUnique.mockResolvedValue(makeApplication());

      await expect(
        service.create('user-brand-1', { applicationId: 'app-1' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.partnershipResult.create).not.toHaveBeenCalled();
    });

    it('recusa candidatura que não está aprovada', async () => {
      prisma.application.findUnique.mockResolvedValue(
        makeApplication({ status: ApplicationStatus.PENDING }),
      );

      await expect(service.create('user-brand-1', dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.partnershipResult.create).not.toHaveBeenCalled();
    });

    it('recusa candidatura de campanha de outra marca', async () => {
      prisma.application.findUnique.mockResolvedValue(makeApplication());

      await expect(service.create('user-outra-marca', dto)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.partnershipResult.create).not.toHaveBeenCalled();
    });

    it('404 quando a candidatura não existe', async () => {
      prisma.application.findUnique.mockResolvedValue(null);

      await expect(service.create('user-brand-1', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('traduz P2002 em 409 — a unique de applicationId é a única fonte de verdade, sem check-then-act', async () => {
      prisma.application.findUnique.mockResolvedValue(makeApplication());
      prisma.partnershipResult.create.mockRejectedValue(p2002());

      await expect(service.create('user-brand-1', dto)).rejects.toThrow(
        ConflictException,
      );
      // Prova que a duplicata NÃO é evitada por leitura prévia: nenhuma consulta
      // ao resultado existente acontece antes da escrita.
      expect(prisma.partnershipResult.findUnique).not.toHaveBeenCalled();
    });

    it('não avisa a creator quando o registro falha', async () => {
      prisma.application.findUnique.mockResolvedValue(makeApplication());
      prisma.partnershipResult.create.mockRejectedValue(p2002());

      await expect(service.create('user-brand-1', dto)).rejects.toThrow(
        ConflictException,
      );
      expect(email.sendPartnershipResult).not.toHaveBeenCalled();
    });
  });

  // ─── update ────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('corrige os campos enviados e preserva os outros', async () => {
      prisma.partnershipResult.findUnique.mockResolvedValue({
        ...makeResult(),
        application: makeApplication(),
      });
      prisma.partnershipResult.update.mockResolvedValue(
        makeResult({ reach: 15000 }),
      );

      const result = await service.update('res-1', 'user-brand-1', {
        reach: 15000,
      });

      expect(result.reach).toBe(15000);
      expect(prisma.partnershipResult.update).toHaveBeenCalledWith({
        where: { id: 'res-1' },
        data: { reach: 15000 },
      });
    });

    it('permite ligar e desligar a publicação depois de registrado', async () => {
      prisma.partnershipResult.findUnique.mockResolvedValue({
        ...makeResult({ brandAllowsPublic: true }),
        application: makeApplication(),
      });
      prisma.partnershipResult.update.mockResolvedValue(makeResult());

      await service.update('res-1', 'user-brand-1', {
        brandAllowsPublic: false,
      });

      expect(prisma.partnershipResult.update).toHaveBeenCalledWith({
        where: { id: 'res-1' },
        data: { brandAllowsPublic: false },
      });
    });

    it('recusa esvaziar o resultado por edição — o caminho pra isso é remover', async () => {
      prisma.partnershipResult.findUnique.mockResolvedValue({
        ...makeResult({ couponsUsed: null, note: null }),
        application: makeApplication(),
      });

      await expect(
        service.update('res-1', 'user-brand-1', { reach: null as never }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.partnershipResult.update).not.toHaveBeenCalled();
    });

    it('recusa editar resultado de campanha de outra marca', async () => {
      prisma.partnershipResult.findUnique.mockResolvedValue({
        ...makeResult(),
        application: makeApplication(),
      });

      await expect(
        service.update('res-1', 'user-outra-marca', { reach: 1 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('404 quando o resultado não existe', async () => {
      prisma.partnershipResult.findUnique.mockResolvedValue(null);

      await expect(
        service.update('res-inexistente', 'user-brand-1', { reach: 1 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── remove ────────────────────────────────────────────────────────────────

  describe('remove()', () => {
    it('apaga o resultado da própria campanha', async () => {
      prisma.partnershipResult.findUnique.mockResolvedValue({
        ...makeResult(),
        application: makeApplication(),
      });

      await service.remove('res-1', 'user-brand-1');

      expect(prisma.partnershipResult.delete).toHaveBeenCalledWith({
        where: { id: 'res-1' },
      });
    });

    it('recusa apagar resultado de campanha de outra marca', async () => {
      prisma.partnershipResult.findUnique.mockResolvedValue({
        ...makeResult(),
        application: makeApplication(),
      });

      await expect(service.remove('res-1', 'user-outra-marca')).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.partnershipResult.delete).not.toHaveBeenCalled();
    });
  });

  // ─── findByCampaign (marca) ────────────────────────────────────────────────

  describe('findByCampaign()', () => {
    it('lista as parcerias aprovadas com o resultado de cada uma, numa única query', async () => {
      prisma.campaign.findUnique.mockResolvedValue({
        id: 'camp-1',
        brand: { userId: 'user-brand-1' },
      });
      prisma.application.findMany.mockResolvedValue([
        {
          id: 'app-1',
          reviewedAt: new Date('2026-09-01'),
          influencer: { id: 'inf-1', name: 'Ana Fitness' },
          result: makeResult(),
        },
        {
          id: 'app-2',
          reviewedAt: new Date('2026-08-30'),
          influencer: { id: 'inf-2', name: 'Bia Runner' },
          result: null,
        },
      ]);

      const partnerships = await service.findByCampaign(
        'camp-1',
        'user-brand-1',
      );

      expect(partnerships).toHaveLength(2);
      expect(partnerships[0]).toMatchObject({
        applicationId: 'app-1',
        result: expect.objectContaining({ reach: 12400 }),
      });
      // Parceria sem resultado ainda aparece — é dela que sai o "pendente".
      expect(partnerships[1]).toMatchObject({
        applicationId: 'app-2',
        result: null,
      });
      expect(prisma.application.findMany).toHaveBeenCalledTimes(1);
    });

    it('pede só candidaturas aprovadas — parceria não existe sem aprovação', async () => {
      prisma.campaign.findUnique.mockResolvedValue({
        id: 'camp-1',
        brand: { userId: 'user-brand-1' },
      });
      prisma.application.findMany.mockResolvedValue([]);

      await service.findByCampaign('camp-1', 'user-brand-1');

      expect(prisma.application.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { campaignId: 'camp-1', status: ApplicationStatus.APPROVED },
        }),
      );
    });

    it('não arrasta o feed de posts do Instagram pra listagem', async () => {
      prisma.campaign.findUnique.mockResolvedValue({
        id: 'camp-1',
        brand: { userId: 'user-brand-1' },
      });
      prisma.application.findMany.mockResolvedValue([]);

      await service.findByCampaign('camp-1', 'user-brand-1');

      const args = prisma.application.findMany.mock.calls[0][0];
      expect(args.include.influencer.select).not.toHaveProperty(
        'igRecentPosts',
      );
    });

    it('recusa campanha de outra marca', async () => {
      prisma.campaign.findUnique.mockResolvedValue({
        id: 'camp-1',
        brand: { userId: 'user-brand-1' },
      });

      await expect(
        service.findByCampaign('camp-1', 'user-outra-marca'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('404 quando a campanha não existe', async () => {
      prisma.campaign.findUnique.mockResolvedValue(null);

      await expect(
        service.findByCampaign('camp-inexistente', 'user-brand-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── findMine (creator) ────────────────────────────────────────────────────

  describe('findMine()', () => {
    it('devolve os resultados das próprias parcerias com marca e campanha', async () => {
      prisma.influencer.findUnique.mockResolvedValue({ id: 'inf-1' });
      prisma.partnershipResult.findMany.mockResolvedValue([
        {
          ...makeResult(),
          application: {
            id: 'app-1',
            campaign: {
              id: 'camp-1',
              title: 'Campanha de Verão',
              brand: { name: 'Lilo Suplementos' },
            },
          },
        },
      ]);

      const results = await service.findMine('user-creator-1');

      expect(results).toEqual([
        expect.objectContaining({
          id: 'res-1',
          applicationId: 'app-1',
          campaignTitle: 'Campanha de Verão',
          brandName: 'Lilo Suplementos',
          reach: 12400,
          couponsUsed: 37,
        }),
      ]);
    });

    it('a creator vê o resultado mesmo quando a marca não liberou pra vitrine — é o diferencial nº 3', async () => {
      prisma.influencer.findUnique.mockResolvedValue({ id: 'inf-1' });
      prisma.partnershipResult.findMany.mockResolvedValue([
        {
          ...makeResult({ brandAllowsPublic: false }),
          application: {
            id: 'app-1',
            campaign: {
              id: 'camp-1',
              title: 'Campanha de Verão',
              brand: { name: 'Lilo Suplementos' },
            },
          },
        },
      ]);

      const results = await service.findMine('user-creator-1');

      expect(results).toHaveLength(1);
      // Nenhum filtro de visibilidade entra na consulta da própria creator.
      const args = prisma.partnershipResult.findMany.mock.calls[0][0];
      expect(JSON.stringify(args.where)).not.toMatch(/rand|idden/);
    });

    it('diz à creator se a marca liberou a publicação — ela precisa saber o que dá pra mostrar', async () => {
      prisma.influencer.findUnique.mockResolvedValue({ id: 'inf-1' });
      prisma.partnershipResult.findMany.mockResolvedValue([
        {
          ...makeResult({ brandAllowsPublic: true, hiddenByCreator: true }),
          application: {
            id: 'app-1',
            campaign: {
              id: 'camp-1',
              title: 'Campanha de Verão',
              brand: { name: 'Lilo Suplementos' },
            },
          },
        },
      ]);

      const [result] = await service.findMine('user-creator-1');

      expect(result).toMatchObject({
        brandAllowsPublic: true,
        hiddenByCreator: true,
      });
    });

    it('recusa quem não tem perfil de creator', async () => {
      prisma.influencer.findUnique.mockResolvedValue(null);

      await expect(service.findMine('user-brand-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ─── setVisibility (creator) ───────────────────────────────────────────────

  describe('setVisibility()', () => {
    it('deixa a creator esconder um resultado do próprio perfil público', async () => {
      prisma.influencer.findUnique.mockResolvedValue({ id: 'inf-1' });
      prisma.partnershipResult.findUnique.mockResolvedValue({
        ...makeResult(),
        application: { influencerId: 'inf-1' },
      });
      prisma.partnershipResult.update.mockResolvedValue(
        makeResult({ hiddenByCreator: true }),
      );

      const result = await service.setVisibility('res-1', 'user-creator-1', {
        hidden: true,
      });

      expect(result.hiddenByCreator).toBe(true);
      expect(prisma.partnershipResult.update).toHaveBeenCalledWith({
        where: { id: 'res-1' },
        data: { hiddenByCreator: true },
      });
    });

    it('deixa mostrar de novo', async () => {
      prisma.influencer.findUnique.mockResolvedValue({ id: 'inf-1' });
      prisma.partnershipResult.findUnique.mockResolvedValue({
        ...makeResult({ hiddenByCreator: true }),
        application: { influencerId: 'inf-1' },
      });
      prisma.partnershipResult.update.mockResolvedValue(makeResult());

      await service.setVisibility('res-1', 'user-creator-1', { hidden: false });

      expect(prisma.partnershipResult.update).toHaveBeenCalledWith({
        where: { id: 'res-1' },
        data: { hiddenByCreator: false },
      });
    });

    it('a creator não mexe na visibilidade do resultado de outra', async () => {
      prisma.influencer.findUnique.mockResolvedValue({ id: 'inf-1' });
      prisma.partnershipResult.findUnique.mockResolvedValue({
        ...makeResult(),
        application: { influencerId: 'inf-OUTRA' },
      });

      await expect(
        service.setVisibility('res-1', 'user-creator-1', { hidden: true }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.partnershipResult.update).not.toHaveBeenCalled();
    });

    it('a creator não altera o consentimento da marca por esta rota', async () => {
      prisma.influencer.findUnique.mockResolvedValue({ id: 'inf-1' });
      prisma.partnershipResult.findUnique.mockResolvedValue({
        ...makeResult(),
        application: { influencerId: 'inf-1' },
      });
      prisma.partnershipResult.update.mockResolvedValue(makeResult());

      await service.setVisibility('res-1', 'user-creator-1', { hidden: true });

      const data = prisma.partnershipResult.update.mock.calls[0][0].data;
      expect(data).not.toHaveProperty('brandAllowsPublic');
    });

    it('404 quando o resultado não existe', async () => {
      prisma.influencer.findUnique.mockResolvedValue({ id: 'inf-1' });
      prisma.partnershipResult.findUnique.mockResolvedValue(null);

      await expect(
        service.setVisibility('res-x', 'user-creator-1', { hidden: true }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
