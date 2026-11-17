import {
  Body,
  Controller,
  Get,
  INestApplication,
  Module,
  Post,
  Req,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IsString } from 'class-validator';
import type { Request } from 'express';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApp } from './bootstrap';

class EchoDto {
  @IsString()
  name!: string;
}

@Controller('probe')
class ProbeController {
  @Get()
  get() {
    return { ok: true };
  }

  @Get('cookies')
  cookies(@Req() req: Request) {
    return req.cookies;
  }

  @Post()
  post(@Body() dto: EchoDto) {
    return dto;
  }
}

@Module({ controllers: [ProbeController] })
class ProbeModule {}

/**
 * O `configureApp` é o que o servidor com `listen` (main.ts) e a função
 * serverless (D-24) compartilham. Se uma das duas montasse o app à mão, uma
 * proteção (CORS, helmet, whitelist do DTO) poderia sumir só num dos lados
 * sem nenhum teste notar. Por isso o teste é do comportamento HTTP, não de
 * "chamou app.use".
 */
describe('configureApp', () => {
  let app: INestApplication<App>;

  async function build(env: NodeJS.ProcessEnv) {
    const mod = await Test.createTestingModule({
      imports: [ProbeModule],
    }).compile();
    app = mod.createNestApplication();
    configureApp(app, env);
    await app.init();
    return app.getHttpServer();
  }

  afterEach(async () => {
    await app?.close();
  });

  it('monta as rotas sob o prefixo api/v1', async () => {
    const server = await build({ NODE_ENV: 'test' });

    await request(server).get('/api/v1/probe').expect(200, { ok: true });
    await request(server).get('/probe').expect(404);
  });

  it('aplica os headers de segurança do helmet', async () => {
    const server = await build({ NODE_ENV: 'test' });

    const res = await request(server).get('/api/v1/probe');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('lê cookies (o refresh token vive num cookie httpOnly)', async () => {
    const server = await build({ NODE_ENV: 'test' });

    await request(server)
      .get('/api/v1/probe/cookies')
      .set('Cookie', 'refresh_token=abc')
      .expect(200, { refresh_token: 'abc' });
  });

  it('rejeita campo fora do DTO e valida tipo', async () => {
    const server = await build({ NODE_ENV: 'test' });

    await request(server)
      .post('/api/v1/probe')
      .send({ name: 'x', role: 'ADMIN' })
      .expect(400);
    await request(server).post('/api/v1/probe').send({ name: 1 }).expect(400);
    await request(server)
      .post('/api/v1/probe')
      .send({ name: 'x' })
      .expect(201, { name: 'x' });
  });

  it('CORS libera só a origem da allow-list, com credenciais', async () => {
    const server = await build({
      NODE_ENV: 'production',
      ALLOWED_ORIGINS: 'https://tayro.app.br',
    });

    const ok = await request(server)
      .get('/api/v1/probe')
      .set('Origin', 'https://tayro.app.br');
    expect(ok.headers['access-control-allow-origin']).toBe(
      'https://tayro.app.br',
    );
    expect(ok.headers['access-control-allow-credentials']).toBe('true');

    const evil = await request(server)
      .get('/api/v1/probe')
      .set('Origin', 'https://evil.example');
    expect(evil.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('em produção sem ALLOWED_ORIGINS, falha em vez de abrir o CORS', async () => {
    await expect(build({ NODE_ENV: 'production' })).rejects.toThrow(
      /ALLOWED_ORIGINS/,
    );
  });

  it('Swagger existe fora de produção e some em produção', async () => {
    const dev = await build({ NODE_ENV: 'development' });
    await request(dev).get('/api/docs').expect(200);
    await app.close();

    const prod = await build({
      NODE_ENV: 'production',
      ALLOWED_ORIGINS: 'https://tayro.app.br',
    });
    await request(prod).get('/api/docs').expect(404);
  });
});
