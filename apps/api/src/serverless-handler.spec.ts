import type { IncomingMessage, ServerResponse } from 'node:http';
import { EventEmitter } from 'node:events';
import * as Sentry from '@sentry/nestjs';
import { waitUntil } from '@vercel/functions';
import { createServerlessHandler } from './serverless-handler';

jest.mock('@vercel/functions', () => ({ waitUntil: jest.fn() }));
jest.mock('@sentry/nestjs', () => ({
  flush: jest.fn().mockResolvedValue(true),
  captureException: jest.fn(),
}));

function fakeRes() {
  const res = new EventEmitter() as EventEmitter & {
    statusCode: number;
    headers: Record<string, string>;
    body?: string;
    setHeader: (k: string, v: string) => void;
    end: (b?: string) => void;
  };
  res.statusCode = 200;
  res.headers = {};
  res.setHeader = (k, v) => (res.headers[k.toLowerCase()] = v);
  res.end = (b) => {
    res.body = b;
    res.emit('finish');
  };
  return res;
}

function fakeApp(express: jest.Mock) {
  return {
    init: jest.fn().mockResolvedValue(undefined),
    getHttpAdapter: () => ({ getInstance: () => express }),
  };
}

const req = {} as IncomingMessage;

/**
 * A função serverless da Vercel (D-24). O app Nest custa caro pra subir
 * (cold start), então nasce UMA vez por instância e atende todas as
 * requisições dela.
 */
describe('createServerlessHandler', () => {
  beforeEach(() => jest.clearAllMocks());

  it('cria o app uma vez só e repassa cada requisição pro Express', async () => {
    const express = jest.fn((_q, r: ReturnType<typeof fakeRes>) => r.end('ok'));
    const create = jest.fn().mockResolvedValue(fakeApp(express));
    const handler = createServerlessHandler(create);

    await handler(req, fakeRes() as unknown as ServerResponse);
    await handler(req, fakeRes() as unknown as ServerResponse);

    expect(create).toHaveBeenCalledTimes(1);
    expect(express).toHaveBeenCalledTimes(2);
  });

  it('requisições simultâneas no cold start esperam o MESMO app', async () => {
    const express = jest.fn((_q, r: ReturnType<typeof fakeRes>) => r.end('ok'));
    const create = jest.fn().mockResolvedValue(fakeApp(express));
    const handler = createServerlessHandler(create);

    await Promise.all([
      handler(req, fakeRes() as unknown as ServerResponse),
      handler(req, fakeRes() as unknown as ServerResponse),
    ]);

    expect(create).toHaveBeenCalledTimes(1);
  });

  it('depois da resposta, esvazia a fila do Sentry segurando a função viva', async () => {
    const express = jest.fn((_q, r: ReturnType<typeof fakeRes>) => r.end('ok'));
    const handler = createServerlessHandler(
      jest.fn().mockResolvedValue(fakeApp(express)),
    );

    await handler(req, fakeRes() as unknown as ServerResponse);

    expect(Sentry.flush).toHaveBeenCalled();
    expect(waitUntil).toHaveBeenCalled();
  });

  it('falha ao subir: 500 genérico sem detalhe, Sentry avisado, e a próxima requisição tenta de novo', async () => {
    const express = jest.fn((_q, r: ReturnType<typeof fakeRes>) => r.end('ok'));
    const create = jest
      .fn()
      .mockRejectedValueOnce(new Error('ALLOWED_ORIGINS é obrigatório'))
      .mockResolvedValueOnce(fakeApp(express));
    const handler = createServerlessHandler(create);

    const res1 = fakeRes();
    await handler(req, res1 as unknown as ServerResponse);

    expect(res1.statusCode).toBe(500);
    expect(res1.body).not.toMatch(/ALLOWED_ORIGINS/);
    expect(Sentry.captureException).toHaveBeenCalled();

    const res2 = fakeRes();
    await handler(req, res2 as unknown as ServerResponse);
    expect(res2.body).toBe('ok');
    expect(create).toHaveBeenCalledTimes(2);
  });
  // O rewrite da Vercel (/api/:__api_path* -> /api/index) acrescenta o trecho
  // capturado como query (?__api_path=v1/campaigns). A ValidationPipe recusa
  // campo desconhecido, então isso virava 400 em toda rota com DTO de query
  // (achado no canário de 2026-11-20). O handler tira só esse parâmetro.
  it('remove o parâmetro do rewrite e preserva o resto da query', async () => {
    const seen: string[] = [];
    const express = jest.fn(
      (q: IncomingMessage, r: ReturnType<typeof fakeRes>) => {
        seen.push(q.url ?? '');
        r.end('ok');
      },
    );
    const handler = createServerlessHandler(
      jest.fn().mockResolvedValue(fakeApp(express)),
      { rewriteParam: '__api_path' },
    );

    for (const url of [
      '/api/v1/campaigns?__api_path=v1%2Fcampaigns',
      '/api/v1/campaigns?page=2&__api_path=v1%2Fcampaigns&limit=12',
      '/api/v1/health',
      '/api/v1/campaigns?page=1',
    ]) {
      await handler(
        { url } as IncomingMessage,
        fakeRes() as unknown as ServerResponse,
      );
    }

    expect(seen).toEqual([
      '/api/v1/campaigns',
      '/api/v1/campaigns?page=2&limit=12',
      '/api/v1/health',
      '/api/v1/campaigns?page=1',
    ]);
  });
});
