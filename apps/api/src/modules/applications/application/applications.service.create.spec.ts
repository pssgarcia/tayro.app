/**
 * ApplicationsService.create — candidatura autenticada
 *
 * Terceira porta de entrada de uma creator numa campanha (as outras duas são o
 * cadastro e a candidatura pública). Até 2026-08-24 era a única das três que
 * nunca disparava a busca do Instagram: a creator já existia, então ninguém
 * assumia a responsabilidade de atualizar o perfil dela.
 *
 * Consequência para a marca: candidatura que chega na Fila com dado velho, ou
 * sem dado nenhum se a creator tinha entrado pelo cadastro. O `refresh`
 * respeita o período de validade de 24h, então agendar aqui não multiplica
 * consumo de cota — só garante que ninguém chegue à Fila sem tentativa.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CampaignStatus } from '@prisma/client';
import { ApplicationsService } from './applications.service';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { InstagramSyncService } from '../../instagram/instagram-sync.service';
import { EmailService } from '../../email/email.service';

describe('ApplicationsService.create', () => {
  let service: ApplicationsService;
  let prisma: jest.Mocked<any>;
  let scheduleRefresh: jest.Mock;

  const dto = { campaignId: 'camp-1', message: 'quero participar' };

  const campaignAtiva = (overrides: Record<string, unknown> = {}) => ({
    id: 'camp-1',
    status: CampaignStatus.ACTIVE,
    maxSpots: 5,
    _count: { applications: 0 },
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      influencer: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'inf-1', userId: 'user-1' }),
      },
      campaign: { findUnique: jest.fn().mockResolvedValue(campaignAtiva()) },
      application: {
        create: jest.fn().mockResolvedValue({ id: 'app-1' }),
      },
      $transaction: jest.fn((arg: unknown) =>
        typeof arg === 'function'
          ? (arg as (tx: unknown) => unknown)(prisma)
          : Promise.all(arg as unknown[]),
      ),
    };

    scheduleRefresh = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: InstagramSyncService,
          useValue: { scheduleRefresh, refresh: jest.fn() },
        },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: EmailService, useValue: {} },
      ],
    }).compile();

    service = module.get(ApplicationsService);
  });

  it('agenda a busca do Instagram da creator que se candidatou', async () => {
    await service.create('user-1', dto);

    expect(scheduleRefresh).toHaveBeenCalledWith('inf-1');
  });

  it('não agenda quando a candidatura não chega a ser criada', async () => {
    // Campanha encerrada: nada de queimar cota de API por candidatura recusada.
    prisma.campaign.findUnique.mockResolvedValue(
      campaignAtiva({ status: CampaignStatus.CLOSED }),
    );

    await expect(service.create('user-1', dto)).rejects.toThrow(
      BadRequestException,
    );
    expect(scheduleRefresh).not.toHaveBeenCalled();
  });

  it('não agenda quando a campanha não existe', async () => {
    prisma.campaign.findUnique.mockResolvedValue(null);

    await expect(service.create('user-1', dto)).rejects.toThrow(
      NotFoundException,
    );
    expect(scheduleRefresh).not.toHaveBeenCalled();
  });

  it('não agenda quando a campanha já está lotada', async () => {
    prisma.campaign.findUnique.mockResolvedValue(
      campaignAtiva({ maxSpots: 1, _count: { applications: 1 } }),
    );

    await expect(service.create('user-1', dto)).rejects.toThrow(
      BadRequestException,
    );
    expect(scheduleRefresh).not.toHaveBeenCalled();
  });

  it('devolve a candidatura criada', async () => {
    await expect(service.create('user-1', dto)).resolves.toEqual({
      id: 'app-1',
    });
  });
});
