/**
 * CreatorsService — emissão do claim token
 *
 * Conta CLAIMABLE (criada via applyPublic) nasce com senha aleatória — a
 * creator só consegue logar depois de definir uma senha via POST /auth/claim.
 * Este arquivo cobre a EMISSÃO do token (o consumo/validação é testado em
 * auth.service.spec.ts, do lado do claimAccount()).
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
  message: 'quero participar',
};

describe('CreatorsService — emissão de claim token', () => {
  let service: CreatorsService;
  let prisma: jest.Mocked<any>;
  let sendClaimAccount: jest.Mock;

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
    const instagramSync = { refresh: jest.fn().mockResolvedValue(undefined) };
    const emailService = { sendClaimAccount };
    const config = {
      getOrThrow: jest.fn().mockReturnValue('http://localhost:5173'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreatorsService,
        { provide: PrismaService, useValue: prisma },
        { provide: InstagramSyncService, useValue: instagramSync },
        { provide: EmailService, useValue: emailService },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get(CreatorsService);
  });

  it('conta nova: grava claimTokenHash/claimTokenExpiresAt e envia o e-mail com o link', async () => {
    prisma.influencer.findUnique.mockResolvedValue(null); // handle não existe
    prisma.user.findUnique.mockResolvedValue(null); // email não existe
    prisma.user.create.mockResolvedValue({
      id: 'user-1',
      influencer: { id: 'inf-1', name: 'Creator' },
    });

    await service.applyPublic('camp-1', applyDto);

    // create() grava hash + expiração — nunca o token cru
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          claimTokenHash: expect.any(String),
          claimTokenExpiresAt: expect.any(Date),
        }),
      }),
    );

    // e-mail recebe o token CRU dentro da URL (não o hash)
    expect(sendClaimAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'creator@example.com',
        creatorName: 'Creator',
        claimUrl: expect.stringMatching(
          /^http:\/\/localhost:5173\/claim\?token=[a-f0-9]{64}$/,
        ),
      }),
    );

    // expiração é no futuro (~7 dias)
    const { claimTokenExpiresAt } = prisma.user.create.mock.calls[0][0].data;
    expect(claimTokenExpiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('reapply com conta ainda não claimada: reemite token e reenvia e-mail', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: UserRole.INFLUENCER,
      claimTokenHash: 'hash-antigo', // ainda não fez claim
    });
    prisma.influencer.findUnique
      .mockResolvedValueOnce(null) // check de handle duplicado
      .mockResolvedValueOnce({
        id: 'inf-1',
        userId: 'user-1',
        name: 'Creator',
        instagramHandle: 'creator',
      }); // lookup do influencer existente pelo userId

    await service.applyPublic('camp-1', applyDto);

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: expect.objectContaining({
          claimTokenHash: expect.any(String),
          claimTokenExpiresAt: expect.any(Date),
        }),
      }),
    );
    expect(sendClaimAccount).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'creator@example.com' }),
    );
  });

  it('reapply com conta já claimada: NÃO reemite token nem reenvia e-mail', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: UserRole.INFLUENCER,
      claimTokenHash: null, // já claimou (ou é registro normal, sempre teve senha)
    });
    prisma.influencer.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'inf-1',
        userId: 'user-1',
        name: 'Creator',
        instagramHandle: 'creator',
      });

    await service.applyPublic('camp-1', applyDto);

    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(sendClaimAccount).not.toHaveBeenCalled();
  });
});
