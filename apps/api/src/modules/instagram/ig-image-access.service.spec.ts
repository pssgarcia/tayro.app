import { JwtService } from '@nestjs/jwt';
import type { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { IgImageAccessService } from './ig-image-access.service';
import type { PrismaService } from '../../shared/infrastructure/database/prisma.service';

const ACCESS_SECRET = 'secret-de-acesso';
const REFRESH_SECRET = 'secret-de-refresh';

describe('IgImageAccessService', () => {
  let prisma: {
    influencer: { findUnique: jest.Mock };
    application: { count: jest.Mock };
  };
  let service: IgImageAccessService;
  let jwt: JwtService;

  const config = {
    get: (key: string) =>
      key === 'JWT_ACCESS_SECRET'
        ? ACCESS_SECRET
        : key === 'JWT_REFRESH_SECRET'
          ? REFRESH_SECRET
          : undefined,
  } as unknown as ConfigService;

  function request(
    options: {
      cookie?: string;
      authorization?: string;
    } = {},
  ): Request {
    return {
      cookies: options.cookie ? { refresh_token: options.cookie } : {},
      headers: options.authorization
        ? { authorization: options.authorization }
        : {},
    } as unknown as Request;
  }

  beforeEach(() => {
    prisma = {
      influencer: { findUnique: jest.fn() },
      application: { count: jest.fn().mockResolvedValue(0) },
    };
    jwt = new JwtService({});
    service = new IgImageAccessService(
      prisma as unknown as PrismaService,
      jwt,
      config,
    );
  });

  it('libera para qualquer pessoa quando o perfil público está LIGADO', async () => {
    prisma.influencer.findUnique.mockResolvedValue({
      userId: 'user-creator',
      publicProfileEnabled: true,
    });

    await expect(service.canView('inf-1', request())).resolves.toBe(true);
    // Não gasta consulta de relação quando já é público.
    expect(prisma.application.count).not.toHaveBeenCalled();
  });

  it('BLOQUEIA visitante anônimo quando o perfil público está DESLIGADO', async () => {
    prisma.influencer.findUnique.mockResolvedValue({
      userId: 'user-creator',
      publicProfileEnabled: false,
    });

    await expect(service.canView('inf-1', request())).resolves.toBe(false);
  });

  it('libera a própria creator pelo cookie de refresh', async () => {
    prisma.influencer.findUnique.mockResolvedValue({
      userId: 'user-creator',
      publicProfileEnabled: false,
    });
    const cookie = jwt.sign(
      { sub: 'user-creator' },
      { secret: REFRESH_SECRET },
    );

    await expect(service.canView('inf-1', request({ cookie }))).resolves.toBe(
      true,
    );
  });

  it('libera marca COM candidatura desta creator', async () => {
    prisma.influencer.findUnique.mockResolvedValue({
      userId: 'user-creator',
      publicProfileEnabled: false,
    });
    prisma.application.count.mockResolvedValue(1);
    const cookie = jwt.sign({ sub: 'user-brand' }, { secret: REFRESH_SECRET });

    await expect(service.canView('inf-1', request({ cookie }))).resolves.toBe(
      true,
    );
    expect(prisma.application.count).toHaveBeenCalledWith({
      where: {
        influencerId: 'inf-1',
        campaign: { brand: { userId: 'user-brand' } },
      },
    });
  });

  it('BLOQUEIA marca SEM candidatura desta creator', async () => {
    prisma.influencer.findUnique.mockResolvedValue({
      userId: 'user-creator',
      publicProfileEnabled: false,
    });
    prisma.application.count.mockResolvedValue(0);
    const cookie = jwt.sign({ sub: 'outra-marca' }, { secret: REFRESH_SECRET });

    await expect(service.canView('inf-1', request({ cookie }))).resolves.toBe(
      false,
    );
  });

  it('aceita também o header Authorization (chamada direta à API)', async () => {
    prisma.influencer.findUnique.mockResolvedValue({
      userId: 'user-creator',
      publicProfileEnabled: false,
    });
    const access = jwt.sign({ sub: 'user-creator' }, { secret: ACCESS_SECRET });

    await expect(
      service.canView('inf-1', request({ authorization: `Bearer ${access}` })),
    ).resolves.toBe(true);
  });

  it('ignora token assinado com o segredo errado', async () => {
    prisma.influencer.findUnique.mockResolvedValue({
      userId: 'user-creator',
      publicProfileEnabled: false,
    });
    // Access token no lugar do cookie de refresh: segredo não bate.
    const wrong = jwt.sign({ sub: 'user-creator' }, { secret: ACCESS_SECRET });

    await expect(
      service.canView('inf-1', request({ cookie: wrong })),
    ).resolves.toBe(false);
  });

  it('ignora token expirado sem lançar', async () => {
    prisma.influencer.findUnique.mockResolvedValue({
      userId: 'user-creator',
      publicProfileEnabled: false,
    });
    const expired = jwt.sign(
      { sub: 'user-creator' },
      { secret: REFRESH_SECRET, expiresIn: '-1s' },
    );

    await expect(
      service.canView('inf-1', request({ cookie: expired })),
    ).resolves.toBe(false);
  });

  it('ignora lixo no cookie sem lançar', async () => {
    prisma.influencer.findUnique.mockResolvedValue({
      userId: 'user-creator',
      publicProfileEnabled: false,
    });

    await expect(
      service.canView('inf-1', request({ cookie: 'não-é-um-jwt' })),
    ).resolves.toBe(false);
  });

  it('creator inexistente não libera nada', async () => {
    prisma.influencer.findUnique.mockResolvedValue(null);
    const cookie = jwt.sign({ sub: 'qualquer' }, { secret: REFRESH_SECRET });

    await expect(service.canView('inf-1', request({ cookie }))).resolves.toBe(
      false,
    );
  });
});
