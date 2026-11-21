import { Controller, Get, Module, Query } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import http, { IncomingMessage, ServerResponse } from 'node:http';
import request from 'supertest';
import { configureApp } from './bootstrap';
import {
  createServerlessHandler,
  VERCEL_REWRITE_PARAM,
} from './serverless-handler';

jest.mock('@vercel/functions', () => ({ waitUntil: jest.fn() }));

class PageDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
}

@Controller('probe')
class ProbeController {
  @Get()
  list(@Query() q: PageDto) {
    return { page: q.page ?? null };
  }
}

@Module({ controllers: [ProbeController] })
class ProbeModule {}

/**
 * O que o runtime Node da Vercel faz com a requisição ANTES de chamar a
 * função: define `req.query` como propriedade PRÓPRIA (os "helpers"), lida da
 * URL original, que inclui o parâmetro injetado pelo rewrite. No Express 5
 * `req.query` é um getter no protótipo, e a propriedade própria o esconde.
 * Mordeu no canário de 2026-11-21: limpar só a URL não bastava.
 */
function asVercelWouldDeliver(req: IncomingMessage) {
  const original = new URL(req.url ?? '/', 'http://x');
  Object.defineProperty(req, 'query', {
    configurable: true,
    enumerable: true,
    get: () => Object.fromEntries(original.searchParams),
  });
}

describe('handler serverless × requisição como a Vercel entrega', () => {
  it('o parâmetro do rewrite não chega na validação, e o resto da query chega', async () => {
    const handler = createServerlessHandler(
      async () => {
        const mod = await Test.createTestingModule({
          imports: [ProbeModule],
        }).compile();
        const app = mod.createNestApplication();
        configureApp(app, { NODE_ENV: 'test' });
        return app;
      },
      { rewriteParam: VERCEL_REWRITE_PARAM },
    );
    const server = http.createServer((req, res: ServerResponse) => {
      asVercelWouldDeliver(req);
      void handler(req, res);
    });

    await request(server)
      .get(`/api/v1/probe?${VERCEL_REWRITE_PARAM}=v1%2Fprobe`)
      .expect(200, { page: null });
    await request(server)
      .get(`/api/v1/probe?page=2&${VERCEL_REWRITE_PARAM}=v1%2Fprobe`)
      .expect(200, { page: 2 });
    // A validação de verdade continua valendo pro resto da query.
    await request(server)
      .get(`/api/v1/probe?page=0&${VERCEL_REWRITE_PARAM}=v1%2Fprobe`)
      .expect(400);
    await request(server)
      .get(`/api/v1/probe?hack=1&${VERCEL_REWRITE_PARAM}=v1%2Fprobe`)
      .expect(400);
  });
});
