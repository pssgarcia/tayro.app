import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../shared/infrastructure/database/prisma.service';

/**
 * Público de propósito (D-24): usado pelo smoke test do CD e pra conferir o
 * canário da Vercel. Não expõe nada além de "ok"/"indisponível"; o motivo de
 * uma falha fica no log e no Sentry, nunca na resposta.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<{ status: 'ok' }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('Serviço indisponível');
    }
    return { status: 'ok' };
  }
}
