import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { resolveAllowedOrigins } from './shared/config/cors';
import { assertRequiredEnv } from './shared/config/required-env';

/**
 * Tudo que o app precisa ANTES de atender a 1ª requisição, num lugar só (D-24).
 *
 * Quem sobe a API são dois pontos de entrada: `main.ts` (servidor com `listen`,
 * dev local/Docker) e a função serverless da Vercel (produção). Se
 * cada um montasse o app à mão, uma proteção (CORS, helmet, whitelist do DTO)
 * poderia existir num e faltar no outro. `env` é parâmetro pra ser testável.
 */
export function configureApp(
  app: INestApplication,
  env: NodeJS.ProcessEnv = process.env,
): void {
  // Security headers
  app.use(helmet());

  // Cookie parsing (needed for httpOnly JWT cookies)
  app.use(cookieParser());

  // Global validation pipe — rejects unknown fields, auto-transforms types
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS — allow-list explícita. Em produção, falha se ALLOWED_ORIGINS ausente.
  app.enableCors({
    origin: resolveAllowedOrigins(env),
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  // Swagger (disabled in production)
  if (env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('TAYRO API')
      .setDescription('API do TAYRO: plataforma de creators fitness')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }
}

/**
 * Cria e configura o app, sem `listen`: o servidor chama `listen` em cima, a
 * função serverless entrega o handler do Express.
 */
export async function createApp(
  env: NodeJS.ProcessEnv = process.env,
): Promise<INestApplication> {
  // ANTES de subir: variáveis lidas em tempo de request não falham no boot por
  // conta própria. Sem esta checagem, a ausência de uma delas só aparece como
  // 500 na cara do usuário (mordeu em 2026-08-24, ver required-env.ts).
  assertRequiredEnv(env);

  const app = await NestFactory.create(AppModule);
  configureApp(app, env);
  return app;
}
