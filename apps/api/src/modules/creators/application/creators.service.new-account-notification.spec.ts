/**
 * CreatorsService — notificação do operador em conta nova (roadmap.md AGORA #0)
 *
 * Instrumentação, não feature de produto: dá ao Pedro visibilidade em tempo
 * real de quem entra pelo funil de candidatura pública, sem precisar
 * consultar o Neon na mão. Por isso as regras são as opostas das de
 * `FRONTEND_URL`: `ADMIN_NOTIFICATION_EMAIL` é OPCIONAL (sem ela, a
 * notificação simplesmente não dispara — não é falha) e só dispara quando uma
 * conta É CRIADA de fato, nunca em reaplicação (handle/e-mail já conhecidos).
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CampaignStatus } from '@prisma/client';
import { CreatorsService } from './creators.service';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { InstagramSyncService } from '../../instagram/instagram-sync.service';
import { EmailService } from '../../email/email.service';

const applyDto = {
  igHandle: 'creator',
  email: 'creator@example.com',
  name: 'Creator',
  phone: '11999990000',
  message: 'quero participar',
  acceptedTermsAndPrivacy: true,
  declaredAdult: true,
};

describe('CreatorsService — notificação de conta nova pro admin', () => {
  let service: CreatorsService;
  let prisma: jest.Mocked<any>;
  let sendClaimAccount: jest.Mock;
  let sendNewAccountNotification: jest.Mock;
  let scheduleRefresh: jest.Mock;
  let getOrThrow: jest.Mock;
  let get: jest.Mock;

  beforeEach(async () => {
    prisma = {
      campaign: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'camp-1', status: CampaignStatus.ACTIVE }),
      },
      influencer: { findUnique: jest.fn(), update: jest.fn() },
      user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      application: {
        create: jest.fn().mockResolvedValue({ id: 'app-1', status: 'PENDING' }),
      },
    };

    sendClaimAccount = jest.fn().mockResolvedValue(undefined);
    sendNewAccountNotification = jest.fn().mockResolvedValue(undefined);
    scheduleRefresh = jest.fn();
    getOrThrow = jest.fn().mockReturnValue('http://localhost:5173');
    get = jest.fn().mockReturnValue('pedro@example.com');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreatorsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: InstagramSyncService,
          useValue: { scheduleRefresh, refresh: jest.fn() },
        },
        {
          provide: EmailService,
          useValue: { sendClaimAccount, sendNewAccountNotification },
        },
        { provide: ConfigService, useValue: { getOrThrow, get } },
      ],
    }).compile();

    service = module.get(CreatorsService);
  });

  /** Conta nova: handle e e-mail inéditos. */
  function newAccountScenario() {
    prisma.influencer.findUnique.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'user-1',
      influencer: { id: 'inf-1', name: 'Creator' },
    });
  }

  it('conta nova + ADMIN_NOTIFICATION_EMAIL configurado: notifica o admin', async () => {
    newAccountScenario();

    await service.applyPublic('camp-1', applyDto);

    expect(sendNewAccountNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'pedro@example.com',
        role: 'INFLUENCER',
        name: 'Creator',
        email: 'creator@example.com',
        detail: '@creator',
      }),
    );
  });

  it('conta nova SEM ADMIN_NOTIFICATION_EMAIL configurado: não tenta notificar', async () => {
    newAccountScenario();
    get.mockReturnValue(undefined);

    await service.applyPublic('camp-1', applyDto);

    expect(sendNewAccountNotification).not.toHaveBeenCalled();
  });

  it('reapply (handle já existe): não notifica — não é conta nova', async () => {
    prisma.influencer.findUnique.mockResolvedValue({
      id: 'inf-1',
      userId: 'user-1',
      name: 'Creator',
      instagramHandle: 'creator',
      phone: '11999990000',
    });

    await service.applyPublic('camp-1', applyDto);

    expect(sendNewAccountNotification).not.toHaveBeenCalled();
  });

  it('notificação do admin fora do ar: a candidatura é criada mesmo assim', async () => {
    newAccountScenario();
    sendNewAccountNotification.mockRejectedValue(
      new Error('SMTP indisponível'),
    );

    await expect(service.applyPublic('camp-1', applyDto)).resolves.toEqual({
      applicationId: 'app-1',
      status: 'PENDING',
    });
  });
});
