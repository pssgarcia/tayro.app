/**
 * CreatorsService — resiliência da candidatura pública
 *
 * A candidatura é o evento de conversão do produto: é o único momento em que
 * uma creator sem conta entra no funil. Nada acessório — link de claim,
 * e-mail, busca do Instagram — pode derrubá-la.
 *
 * BUG REAL (2026-08-24, reproduzido em produção): `FRONTEND_URL` faltava no
 * Railway. O caminho era:
 *   1. `user.create` gravava User + Influencer (commitado)
 *   2. montar o link do claim chamava `getOrThrow('FRONTEND_URL')` → throw
 *   3. `application.create` nunca rodava → 500 para a creator
 *   4. o `scheduleIgFetch` também nunca rodava → creator sem dado de Instagram
 *   5. na 2ª tentativa o handle já existia → 201
 * Resultado: "toda vez dá erro na primeira e funciona na segunda".
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CampaignStatus, UserRole } from '@prisma/client';
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

describe('CreatorsService — candidatura pública resiste a falha acessória', () => {
  let service: CreatorsService;
  let prisma: jest.Mocked<any>;
  let sendClaimAccount: jest.Mock;
  let scheduleRefresh: jest.Mock;
  let getOrThrow: jest.Mock;

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
    scheduleRefresh = jest.fn();
    getOrThrow = jest.fn().mockReturnValue('http://localhost:5173');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreatorsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: InstagramSyncService,
          useValue: { scheduleRefresh, refresh: jest.fn() },
        },
        { provide: EmailService, useValue: { sendClaimAccount } },
        {
          provide: ConfigService,
          // `get` sem valor default = ADMIN_NOTIFICATION_EMAIL "não configurada"
          // nestes testes, que não são sobre a notificação do admin.
          useValue: { getOrThrow, get: jest.fn() },
        },
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

  it('FRONTEND_URL ausente: a candidatura é criada mesmo assim', async () => {
    newAccountScenario();
    // Exatamente o que o getOrThrow do @nestjs/config faz quando a var falta.
    getOrThrow.mockImplementation(() => {
      throw new Error('Configuration key "FRONTEND_URL" does not exist');
    });

    const result = await service.applyPublic('camp-1', applyDto);

    expect(result).toEqual({ applicationId: 'app-1', status: 'PENDING' });
    expect(prisma.application.create).toHaveBeenCalled();
  });

  it('FRONTEND_URL ausente: o sync do Instagram ainda é agendado', async () => {
    newAccountScenario();
    getOrThrow.mockImplementation(() => {
      throw new Error('Configuration key "FRONTEND_URL" does not exist');
    });

    await service.applyPublic('camp-1', applyDto);

    // Segunda vítima do bug original: a marca via "Dados do Instagram
    // indisponíveis" porque a busca nunca chegava a ser agendada.
    expect(scheduleRefresh).toHaveBeenCalledWith('inf-1');
  });

  it('provedor de e-mail fora do ar: a candidatura é criada mesmo assim', async () => {
    newAccountScenario();
    sendClaimAccount.mockRejectedValue(new Error('SMTP indisponível'));

    await expect(service.applyPublic('camp-1', applyDto)).resolves.toEqual({
      applicationId: 'app-1',
      status: 'PENDING',
    });
  });

  it('reapply: falha ao reemitir o token de claim não derruba a candidatura', async () => {
    // Handle novo, e-mail conhecido de conta ainda não claimada → reemissão.
    prisma.influencer.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'inf-1',
        userId: 'user-1',
        name: 'Creator',
        instagramHandle: 'creator',
        phone: '11999990000',
      });
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: UserRole.INFLUENCER,
      claimTokenHash: 'hash-antigo',
    });
    // Falha SÓ na gravação do token de claim, que é o efeito acessório sob
    // teste. A gravação do aceite dos documentos legais (que hoje também usa
    // `user.update`) tem que continuar funcionando: ela não é acessória, e
    // rejeitar tudo aqui testaria uma coisa diferente da que o nome diz.
    prisma.user.update.mockImplementation(
      (args: { data?: Record<string, unknown> }) =>
        args?.data && 'claimTokenHash' in args.data
          ? Promise.reject(new Error('deadlock'))
          : Promise.resolve(undefined),
    );

    await expect(service.applyPublic('camp-1', applyDto)).resolves.toEqual({
      applicationId: 'app-1',
      status: 'PENDING',
    });
  });

  it('caminho feliz continua enviando o link de claim', async () => {
    // Guarda contra "consertar" tornando o e-mail opcional de verdade.
    newAccountScenario();

    await service.applyPublic('camp-1', applyDto);

    expect(sendClaimAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'creator@example.com',
        claimUrl: expect.stringMatching(
          /^http:\/\/localhost:5173\/claim\?token=[a-f0-9]{64}$/,
        ),
      }),
    );
  });

  it('falha ao criar a candidatura continua propagando (não é acessória)', async () => {
    newAccountScenario();
    prisma.application.create.mockRejectedValue(new Error('banco fora do ar'));

    await expect(service.applyPublic('camp-1', applyDto)).rejects.toThrow(
      'banco fora do ar',
    );
  });
});
