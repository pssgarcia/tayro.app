import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { CreatorsService } from './creators.service';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { InstagramSyncService } from '../../instagram/instagram-sync.service';
import { EmailService } from '../../email/email.service';
import {
  PRIVACY_VERSION,
  TERMS_VERSION,
} from '../../../shared/legal/legal-documents';

const applyDto = {
  igHandle: 'creator',
  email: 'creator@example.com',
  name: 'Creator',
  phone: '11999990000',
  message: 'quero participar',
  acceptedTermsAndPrivacy: true,
  declaredAdult: true,
};

describe('CreatorsService — aceite dos documentos na candidatura pública', () => {
  let service: CreatorsService;
  let prisma: jest.Mocked<any>;

  beforeEach(async () => {
    prisma = {
      campaign: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'camp-1', status: 'ACTIVE' }),
      },
      influencer: { findUnique: jest.fn(), update: jest.fn() },
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue(undefined),
      },
      application: {
        create: jest.fn().mockResolvedValue({ id: 'app-1', status: 'PENDING' }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreatorsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: InstagramSyncService,
          useValue: { scheduleRefresh: jest.fn() },
        },
        {
          provide: EmailService,
          useValue: {
            sendClaimAccount: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('http://web'),
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(CreatorsService);
  });

  /** Conta nova: nenhum influencer por handle, nenhum user por e-mail. */
  function contaNova() {
    prisma.influencer.findUnique.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'user-1',
      influencer: { id: 'inf-1', name: 'Creator', userId: 'user-1' },
    });
  }

  /** Conta que já existia, achada pelo handle. */
  function contaExistente(userOverrides: Record<string, unknown> = {}) {
    prisma.influencer.findUnique.mockResolvedValue({
      id: 'inf-1',
      userId: 'user-1',
      name: 'Creator',
      instagramHandle: 'creator',
      phone: '11999990000',
    });
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: UserRole.INFLUENCER,
      acceptedTermsVersion: null,
      acceptedPrivacyVersion: null,
      declaredAdultAt: null,
      ...userOverrides,
    });
  }

  it('conta NOVA nasce com o aceite gravado no mesmo create', async () => {
    contaNova();

    await service.applyPublic('camp-1', applyDto);

    const data = prisma.user.create.mock.calls[0][0].data;
    expect(data.acceptedTermsVersion).toBe(TERMS_VERSION);
    expect(data.acceptedPrivacyVersion).toBe(PRIVACY_VERSION);
    expect(data.acceptedAt).toBeInstanceOf(Date);
    expect(data.declaredAdultAt).toBeInstanceOf(Date);
  });

  it('conta que JÁ EXISTIA sem aceite passa a ter o aceite registrado', async () => {
    contaExistente();

    await service.applyPublic('camp-1', applyDto);

    const aceite = prisma.user.update.mock.calls.find(
      (c: [{ data: Record<string, unknown> }]) =>
        'acceptedTermsVersion' in c[0].data,
    );
    expect(aceite).toBeDefined();
    expect(aceite[0]).toMatchObject({
      where: { id: 'user-1' },
      data: {
        acceptedTermsVersion: TERMS_VERSION,
        acceptedPrivacyVersion: PRIVACY_VERSION,
      },
    });
    expect(aceite[0].data.declaredAdultAt).toBeInstanceOf(Date);
  });

  // O primeiro aceite de um texto é o que vale como prova. Reescrever a data a
  // cada candidatura apagaria justamente quando a pessoa concordou com aquela
  // versão.
  it('NÃO reescreve aceite já registrado na versão em vigor', async () => {
    contaExistente({
      acceptedTermsVersion: TERMS_VERSION,
      acceptedPrivacyVersion: PRIVACY_VERSION,
      declaredAdultAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    await service.applyPublic('camp-1', applyDto);

    const escritas = prisma.user.update.mock.calls.filter(
      (c: [{ data: Record<string, unknown> }]) =>
        'acceptedTermsVersion' in c[0].data ||
        'declaredAdultAt' in c[0].data ||
        'acceptedAt' in c[0].data,
    );
    expect(escritas).toHaveLength(0);
  });

  it('re-registra quando a versão guardada é ANTERIOR à em vigor', async () => {
    contaExistente({
      acceptedTermsVersion: '0.9',
      acceptedPrivacyVersion: '0.9',
      declaredAdultAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    await service.applyPublic('camp-1', applyDto);

    const aceite = prisma.user.update.mock.calls.find(
      (c: [{ data: Record<string, unknown> }]) =>
        'acceptedTermsVersion' in c[0].data,
    );
    expect(aceite[0].data).toMatchObject({
      acceptedTermsVersion: TERMS_VERSION,
      acceptedPrivacyVersion: PRIVACY_VERSION,
    });
    // A declaração de maioridade antiga permanece: declarar duas vezes não é
    // mais verdadeiro que declarar uma, e a primeira data é a que interessa.
    expect(aceite[0].data).not.toHaveProperty('declaredAdultAt');
  });

  it('preserva a declaração de maioridade já feita, mesmo re-registrando o aceite', async () => {
    contaExistente({
      acceptedTermsVersion: '0.9',
      acceptedPrivacyVersion: PRIVACY_VERSION,
      declaredAdultAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    await service.applyPublic('camp-1', applyDto);

    const escritas = prisma.user.update.mock.calls.filter(
      (c: [{ data: Record<string, unknown> }]) =>
        'declaredAdultAt' in c[0].data,
    );
    expect(escritas).toHaveLength(0);
  });

  // Aceite não é efeito acessório como o e-mail de claim: se não conseguimos
  // registrá-lo, não seguimos criando atividade na conta.
  it('falha na gravação do aceite DERRUBA a candidatura (não é best-effort)', async () => {
    contaExistente();
    prisma.user.update.mockRejectedValue(new Error('banco fora'));

    await expect(service.applyPublic('camp-1', applyDto)).rejects.toThrow(
      'banco fora',
    );
    expect(prisma.application.create).not.toHaveBeenCalled();
  });
});
