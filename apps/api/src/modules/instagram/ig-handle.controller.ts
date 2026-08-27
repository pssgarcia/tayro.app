import {
  Controller,
  Get,
  Param,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { UseGuards } from '@nestjs/common';
import { INSTAGRAM_PROVIDER } from './instagram.constants';
import type { InstagramProvider, HandleCheckResult } from './instagram.types';
import { INSTAGRAM_HANDLE_FORMAT } from '../../shared/validation/instagram-handle';

interface HandleCheckResponse {
  handle: string;
  result: HandleCheckResult;
}

/**
 * Verificação de existência de um @, sem dado de perfil nenhum na resposta.
 * Rota pública, cara (paga cota de terceiro) e sujeita a abuso — por isso tem
 * DOIS limites, não um: por origem (@Throttle, IP) e um teto GLOBAL de
 * consultas ao provedor por minuto. O teto global degrada pra UNKNOWN, nunca
 * erro — não é bloqueio de segurança, é um freio de custo.
 *
 * Ver specs/instagram-sync/spec.md → "Verificação de existência de um @".
 */
@Controller('ig')
export class IgHandleController {
  private budgetWindowStart = 0;
  private budgetUsed = 0;
  private readonly budgetPerMinute: number;

  constructor(
    @Inject(INSTAGRAM_PROVIDER) private readonly provider: InstagramProvider,
    config: ConfigService,
  ) {
    this.budgetPerMinute = parseInt(
      config.get<string>('IG_HANDLE_CHECK_BUDGET_PER_MINUTE', '60'),
      10,
    );
  }

  @Get('handle/:handle')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async check(
    @Param('handle') rawHandle: string,
  ): Promise<HandleCheckResponse> {
    const handle = rawHandle.trim().replace(/^@+/, '').toLowerCase();

    if (!INSTAGRAM_HANDLE_FORMAT.test(handle)) {
      throw new BadRequestException(
        'Handle inválido — sem @, apenas letras, números, pontos e underscores',
      );
    }

    if (!this.consumeBudget()) {
      return { handle, result: 'UNKNOWN' };
    }

    const result = await this.provider.checkHandle(handle);
    return { handle, result };
  }

  /** Janela deslizante simples: reseta a cada minuto corrido desde o 1º uso da janela. */
  private consumeBudget(): boolean {
    const now = Date.now();
    if (now - this.budgetWindowStart >= 60_000) {
      this.budgetWindowStart = now;
      this.budgetUsed = 0;
    }
    if (this.budgetUsed >= this.budgetPerMinute) return false;
    this.budgetUsed += 1;
    return true;
  }
}
