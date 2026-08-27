// PRIMEIRA linha do processo — antes de qualquer @nestjs/*. O Sentry precisa
// aplicar os patches de auto-instrumentação (http/express/prisma) antes dos
// módulos carregarem. Sem DSN, o init não roda e isto é inerte.
import './instrument';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { resolveAllowedOrigins } from './shared/config/cors';
import { assertRequiredEnv } from './shared/config/required-env';

async function bootstrap() {
  // ANTES de subir o servidor: variáveis lidas em tempo de request não falham
  // no boot por conta própria — sem esta checagem, a ausência de uma delas só
  // aparece como 500 na cara do usuário (mordeu em 2026-08-24, ver required-env.ts).
  assertRequiredEnv(process.env);

  const app = await NestFactory.create(AppModule);

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
    origin: resolveAllowedOrigins(process.env),
    credentials: true,
  });

  // API prefix
  app.setGlobalPrefix('api/v1');

  // Swagger (disabled in production)
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('TAYRO API')
      .setDescription('API do TAYRO — CRM de creators fitness')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`API running on port ${port}`);
}

bootstrap();
