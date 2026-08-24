/**
 * IgImageService — guardar os bytes das imagens do Instagram (D-18).
 *
 * As URLs da CDN do Instagram são assinadas e expiram: guardar o endereço não
 * é guardar a imagem. Três invariantes valem o teste aqui:
 *   1. best-effort — nunca lança, nunca derruba o sync que a chamou;
 *   2. o que entra no banco é validado (host, tipo de mídia, tamanho);
 *   3. re-sincronizar substitui a mesma posição, nunca acumula.
 */
import { IgImageKind } from '@prisma/client';
import { IgImageService, isAllowedImageHost } from './ig-image.service';
import { PrismaService } from '../../shared/infrastructure/database/prisma.service';

const URL_OK = 'https://scontent.cdninstagram.com/v/t51/pic.jpg';

function makeService() {
  const prisma = {
    igImage: {
      findUnique: jest.fn(),
      upsert: jest.fn().mockResolvedValue(undefined),
    },
  };
  const service = new IgImageService(prisma as unknown as PrismaService);
  jest.spyOn(service['logger'], 'warn').mockImplementation(() => undefined);
  return { service, prisma };
}

/** Resposta de upstream falsa, no formato que o `fetch` global devolve. */
function upstream({
  ok = true,
  contentType = 'image/jpeg',
  bytes = 3,
}: { ok?: boolean; contentType?: string | null; bytes?: number } = {}) {
  return {
    ok,
    headers: {
      get: (k: string) => (k === 'content-type' ? contentType : null),
    },
    arrayBuffer: () => Promise.resolve(new Uint8Array(bytes).buffer),
  };
}

let fetchMock: jest.Mock;

beforeEach(() => {
  fetchMock = jest.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe('isAllowedImageHost', () => {
  it.each([
    'https://scontent.cdninstagram.com/x.jpg',
    'https://a.b.fbcdn.net/x.jpg',
  ])('aceita host permitido: %s', (url) => {
    expect(isAllowedImageHost(url)).toBe(true);
  });

  it.each([
    ['host qualquer', 'https://evil.example.com/x.jpg'],
    ['sufixo forjado', 'https://cdninstagram.com.evil.com/x.jpg'],
    ['sem https', 'http://scontent.cdninstagram.com/x.jpg'],
    ['url inválida', 'nao-e-url'],
  ])('recusa %s', (_nome, url) => {
    expect(isAllowedImageHost(url)).toBe(false);
  });
});

describe('IgImageService.fetchAndStore', () => {
  it('guarda a imagem e o tamanho em bytes', async () => {
    const { service, prisma } = makeService();
    fetchMock.mockResolvedValue(upstream({ bytes: 42 }));

    const ok = await service.fetchAndStore(
      'inf-1',
      IgImageKind.PROFILE,
      0,
      URL_OK,
    );

    expect(ok).toBe(true);
    const arg = prisma.igImage.upsert.mock.calls[0][0];
    expect(arg.create).toMatchObject({
      influencerId: 'inf-1',
      kind: IgImageKind.PROFILE,
      position: 0,
      mimeType: 'image/jpeg',
      byteSize: 42,
      sourceUrl: URL_OK,
    });
  });

  // O @@unique(influencerId, kind, position) é o que torna isto idempotente
  // sem check-then-act: re-sincronizar substitui, nunca duplica.
  it('usa a chave única (creator, tipo, posição) — re-sync substitui', async () => {
    const { service, prisma } = makeService();
    fetchMock.mockResolvedValue(upstream());

    await service.fetchAndStore('inf-1', IgImageKind.POST, 3, URL_OK);

    expect(prisma.igImage.upsert.mock.calls[0][0].where).toEqual({
      influencerId_kind_position: {
        influencerId: 'inf-1',
        kind: IgImageKind.POST,
        position: 3,
      },
    });
  });

  it('normaliza o tipo de mídia com parâmetros (image/jpeg; charset=...)', async () => {
    const { service, prisma } = makeService();
    fetchMock.mockResolvedValue(
      upstream({ contentType: 'image/JPEG; charset=utf-8' }),
    );

    await service.fetchAndStore('inf-1', IgImageKind.PROFILE, 0, URL_OK);

    expect(prisma.igImage.upsert.mock.calls[0][0].create.mimeType).toBe(
      'image/jpeg',
    );
  });

  // SSRF: a URL sai do banco, mas isso não dispensa validar o host.
  it('não faz requisição nenhuma quando o host não é permitido', async () => {
    const { service, prisma } = makeService();

    const ok = await service.fetchAndStore(
      'inf-1',
      IgImageKind.PROFILE,
      0,
      'https://evil.example.com/x.jpg',
    );

    expect(ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(prisma.igImage.upsert).not.toHaveBeenCalled();
  });

  it.each([
    ['tipo não permitido', { contentType: 'text/html' }],
    ['sem content-type', { contentType: null }],
    ['acima do teto de 2MB', { bytes: 2_000_001 }],
    ['vazia', { bytes: 0 }],
    ['upstream recusou', { ok: false }],
  ])('descarta imagem %s — nada é gravado', async (_nome, resposta) => {
    const { service, prisma } = makeService();
    fetchMock.mockResolvedValue(upstream(resposta));

    const ok = await service.fetchAndStore(
      'inf-1',
      IgImageKind.PROFILE,
      0,
      URL_OK,
    );

    expect(ok).toBe(false);
    expect(prisma.igImage.upsert).not.toHaveBeenCalled();
  });

  // Best-effort: quem chama é o sync, que não pode cair por causa de imagem.
  it('não propaga erro de rede', async () => {
    const { service } = makeService();
    fetchMock.mockRejectedValue(new Error('rede fora'));

    await expect(
      service.fetchAndStore('inf-1', IgImageKind.PROFILE, 0, URL_OK),
    ).resolves.toBe(false);
  });

  it('não propaga erro do banco', async () => {
    const { service, prisma } = makeService();
    fetchMock.mockResolvedValue(upstream());
    prisma.igImage.upsert.mockRejectedValue(new Error('banco fora'));

    await expect(
      service.fetchAndStore('inf-1', IgImageKind.PROFILE, 0, URL_OK),
    ).resolves.toBe(false);
  });
});

describe('IgImageService.findOrBackfill', () => {
  it('devolve o que já está guardado sem tocar na rede', async () => {
    const { service, prisma } = makeService();
    prisma.igImage.findUnique.mockResolvedValue({
      data: Buffer.from([1, 2]),
      mimeType: 'image/png',
    });

    const image = await service.findOrBackfill(
      'inf-1',
      IgImageKind.PROFILE,
      0,
      URL_OK,
    );

    expect(image?.mimeType).toBe('image/png');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // É o que permite adoção gradual: creator que se candidatou antes da D-18
  // passa a ter imagem guardada no primeiro acesso, sem script de migração.
  it('grava no primeiro acesso quando ainda não há imagem', async () => {
    const { service, prisma } = makeService();
    prisma.igImage.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        data: Buffer.from([9]),
        mimeType: 'image/jpeg',
      });
    fetchMock.mockResolvedValue(upstream());

    const image = await service.findOrBackfill(
      'inf-1',
      IgImageKind.PROFILE,
      0,
      URL_OK,
    );

    expect(prisma.igImage.upsert).toHaveBeenCalled();
    expect(image?.mimeType).toBe('image/jpeg');
  });

  it('devolve null quando não há imagem nem endereço de origem', async () => {
    const { service, prisma } = makeService();
    prisma.igImage.findUnique.mockResolvedValue(null);

    const image = await service.findOrBackfill(
      'inf-1',
      IgImageKind.PROFILE,
      0,
      null,
    );

    expect(image).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('IgImageService.storeFromProfile', () => {
  it('guarda a foto de perfil e as thumbnails do feed', async () => {
    const { service, prisma } = makeService();
    fetchMock.mockResolvedValue(upstream());

    await service.storeFromProfile('inf-1', URL_OK, [URL_OK, URL_OK]);

    const kinds = prisma.igImage.upsert.mock.calls.map(
      (c: [{ create: { kind: string; position: number } }]) => [
        c[0].create.kind,
        c[0].create.position,
      ],
    );
    expect(kinds).toEqual(
      expect.arrayContaining([
        [IgImageKind.PROFILE, 0],
        [IgImageKind.POST, 0],
        [IgImageKind.POST, 1],
      ]),
    );
  });

  it('guarda no máximo 6 posts (o que a grade da UI mostra)', async () => {
    const { service, prisma } = makeService();
    fetchMock.mockResolvedValue(upstream());

    await service.storeFromProfile('inf-1', null, Array(12).fill(URL_OK));

    expect(prisma.igImage.upsert).toHaveBeenCalledTimes(6);
  });

  it('uma imagem que falha não impede as outras', async () => {
    const { service, prisma } = makeService();
    fetchMock
      .mockResolvedValueOnce(upstream({ ok: false }))
      .mockResolvedValue(upstream());

    await service.storeFromProfile('inf-1', URL_OK, [URL_OK, URL_OK]);

    expect(prisma.igImage.upsert).toHaveBeenCalledTimes(2);
  });

  it('sem foto e sem posts, não faz requisição nenhuma', async () => {
    const { service } = makeService();

    await service.storeFromProfile('inf-1', null, []);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
