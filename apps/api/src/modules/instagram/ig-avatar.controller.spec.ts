import { IgAvatarController } from './ig-avatar.controller';
import { PrismaService } from '../../shared/infrastructure/database/prisma.service';
import type { Response } from 'express';

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

function makeController(igProfilePicUrl: string | null) {
  const prisma = {
    influencer: {
      findUnique: () =>
        Promise.resolve(igProfilePicUrl ? { igProfilePicUrl } : null),
    },
  } as unknown as PrismaService;
  return new IgAvatarController(prisma);
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

    await controller.avatar('abc', res as unknown as Response);

    expect(res.statusCode).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('SSRF: 404 e NÃO faz fetch quando o host não é do Instagram', async () => {
    const controller = makeController(
      'https://evil.example.com/internal/secret',
    );
    const res = makeRes();

    await controller.avatar('abc', res as unknown as Response);

    expect(res.statusCode).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('SSRF: 404 quando o host apenas contém cdninstagram como prefixo (não sufixo)', async () => {
    const controller = makeController(
      'https://cdninstagram.com.evil.com/x.jpg',
    );
    const res = makeRes();

    await controller.avatar('abc', res as unknown as Response);

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

    await controller.avatar('abc', res as unknown as Response);

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

    await controller.avatar('abc', res as unknown as Response);

    expect(res.statusCode).toBe(404);
  });
});
