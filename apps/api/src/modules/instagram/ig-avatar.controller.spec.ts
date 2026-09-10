import { IgAvatarController } from './ig-avatar.controller';
import { PrismaService } from '../../shared/infrastructure/database/prisma.service';
import { IgImageService } from './ig-image.service';
import type { IgImageAccessService } from './ig-image-access.service';
import type { Request, Response } from 'express';

// Requisição fake. Quem decide a autorização nos testes abaixo é o
// `IgImageAccessService` dublê — o conteúdo do request só precisa existir.
const req = { cookies: {}, headers: {} } as unknown as Request;

// Response fake — captura status/headers/body sem um servidor HTTP real.
function makeRes() {
  const headers: Record<string, string> = {};
  return {
    statusCode: 200,
    headers,
    body: undefined as Buffer | undefined,
    headersSent: false,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    setHeader(k: string, v: string) {
      headers[k] = v;
    },
    end(buf?: Buffer) {
      this.body = buf;
      this.headersSent = true;
    },
  };
}

function makeController(
  igProfilePicUrl: string | null,
  access: Partial<IgImageAccessService> = {},
) {
  const prisma = {
    influencer: {
      findUnique: () =>
        Promise.resolve(
          igProfilePicUrl
            ? {
                igProfilePicUrl,
                // A rota de post lê daqui. Sem isto ela devolveria 404 por
                // falta de URL de origem, e um teste de autorização passaria
                // mesmo com o gate removido (falso verde).
                igRecentPosts: [{ thumbnail: igProfilePicUrl }],
              }
            : null,
        ),
    },
  } as unknown as PrismaService;
  // IgImageService real, com um "banco" de imagens em memória: os testes de
  // SSRF e de upstream continuam exercitando a allow-list e o fetch de
  // verdade, agora por dentro do serviço de imagem. O armazenamento precisa
  // ter estado pra que o backfill (grava e serve no mesmo pedido) funcione.
  const guardadas = new Map<string, { data: Buffer; mimeType: string }>();
  const chave = (w: { influencerId_kind_position: Record<string, unknown> }) =>
    JSON.stringify(w.influencerId_kind_position);
  const igImages = new IgImageService({
    igImage: {
      findUnique: ({ where }: { where: never }) =>
        Promise.resolve(guardadas.get(chave(where)) ?? null),
      upsert: ({ where, create }: { where: never; create: never }) => {
        const { data, mimeType } = create as unknown as {
          data: Buffer;
          mimeType: string;
        };
        guardadas.set(chave(where), { data, mimeType });
        return Promise.resolve(undefined);
      },
    },
  } as unknown as PrismaService);

  // Default dos testes já existentes: autorizado e não público. Os testes de
  // autorização abaixo passam o dublê explícito.
  const accessService = {
    canView: jest.fn().mockResolvedValue(true),
    isPubliclyVisible: jest.fn().mockResolvedValue(false),
    ...access,
  } as unknown as IgImageAccessService;

  return new IgAvatarController(prisma, igImages, accessService);
}

describe('IgAvatarController', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('404 quando a influencer não tem foto de perfil', async () => {
    const controller = makeController(null);
    const res = makeRes();

    await controller.avatar('abc', req, res as unknown as Response);

    expect(res.statusCode).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('SSRF: 404 e NÃO faz fetch quando o host não é do Instagram', async () => {
    const controller = makeController(
      'https://evil.example.com/internal/secret',
    );
    const res = makeRes();

    await controller.avatar('abc', req, res as unknown as Response);

    expect(res.statusCode).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('SSRF: 404 quando o host apenas contém cdninstagram como prefixo (não sufixo)', async () => {
    const controller = makeController(
      'https://cdninstagram.com.evil.com/x.jpg',
    );
    const res = makeRes();

    await controller.avatar('abc', req, res as unknown as Response);

    expect(res.statusCode).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('faz stream da imagem quando a URL é de um host permitido', async () => {
    const controller = makeController(
      'https://scontent-fra5-2.cdninstagram.com/v/t51.82787-19/pic.jpg?oe=abc',
    );
    const res = makeRes();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      headers: {
        get: (k: string) => (k === 'content-type' ? 'image/jpeg' : null),
      },
      arrayBuffer: () => Promise.resolve(new Uint8Array([1, 2, 3]).buffer),
    });

    await controller.avatar('abc', req, res as unknown as Response);

    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Type']).toBe('image/jpeg');
    expect(res.headers['Cross-Origin-Resource-Policy']).toBe('cross-origin');
    expect(res.body).toEqual(Buffer.from([1, 2, 3]));
  });

  it('404 quando o upstream do Instagram falha', async () => {
    const controller = makeController(
      'https://scontent.cdninstagram.com/v/t51.82787-19/pic.jpg',
    );
    const res = makeRes();
    fetchMock.mockResolvedValueOnce({ ok: false, status: 403 });

    await controller.avatar('abc', req, res as unknown as Response);

    expect(res.statusCode).toBe(404);
  });

  // ─── Autorização (o perfil público voltando a valer para as imagens) ───────

  describe('autorização', () => {
    const validUpstream = () => ({
      ok: true,
      headers: {
        get: (k: string) => (k === 'content-type' ? 'image/jpeg' : null),
      },
      arrayBuffer: () => Promise.resolve(new Uint8Array([1, 2, 3]).buffer),
    });

    it('404 na foto de perfil quando o espectador não pode ver', async () => {
      const controller = makeController(
        'https://scontent.cdninstagram.com/v/t51.82787-19/pic.jpg',
        { canView: jest.fn().mockResolvedValue(false) },
      );
      const res = makeRes();
      fetchMock.mockResolvedValue(validUpstream());

      await controller.avatar('abc', req, res as unknown as Response);

      expect(res.statusCode).toBe(404);
      // O ponto do teste: recusar ANTES de qualquer trabalho. Se a checagem
      // fosse feita depois do backfill, um id não autorizado ainda faria a
      // API baixar a foto da CDN do Instagram para então recusá-la.
      expect(fetchMock).not.toHaveBeenCalled();
      expect(res.body).toBeUndefined();
    });

    it('404 na thumbnail de post quando o espectador não pode ver', async () => {
      const controller = makeController(
        'https://scontent.cdninstagram.com/v/t51.71878-15/thumb.jpg',
        { canView: jest.fn().mockResolvedValue(false) },
      );
      const res = makeRes();
      fetchMock.mockResolvedValue(validUpstream());

      await controller.post('abc', '0', req, res as unknown as Response);

      expect(res.statusCode).toBe(404);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('perfil NÃO público entrega com Cache-Control private (cache compartilhado não pode guardar)', async () => {
      const controller = makeController(
        'https://scontent.cdninstagram.com/v/t51.82787-19/pic.jpg',
        {
          canView: jest.fn().mockResolvedValue(true),
          isPubliclyVisible: jest.fn().mockResolvedValue(false),
        },
      );
      const res = makeRes();
      fetchMock.mockResolvedValueOnce(validUpstream());

      await controller.avatar('abc', req, res as unknown as Response);

      expect(res.statusCode).toBe(200);
      expect(res.headers['Cache-Control']).toBe('private, max-age=86400');
      expect(res.headers['Vary']).toBe('Cookie, Authorization');
    });

    it('perfil público entrega com Cache-Control public', async () => {
      const controller = makeController(
        'https://scontent.cdninstagram.com/v/t51.82787-19/pic.jpg',
        {
          canView: jest.fn().mockResolvedValue(true),
          isPubliclyVisible: jest.fn().mockResolvedValue(true),
        },
      );
      const res = makeRes();
      fetchMock.mockResolvedValueOnce(validUpstream());

      await controller.avatar('abc', req, res as unknown as Response);

      expect(res.statusCode).toBe(200);
      expect(res.headers['Cache-Control']).toBe('public, max-age=86400');
    });
  });
});
