import {
  IsUUID,
  IsOptional,
  IsInt,
  IsString,
  IsBoolean,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Teto das métricas declaradas. Não é opinião sobre alcance plausível: a
 * coluna é `Int` (int4 no Postgres, máx. 2.147.483.647) e um número acima
 * disso viraria erro de banco — 500 na cara da marca em vez de 400 explicando
 * o campo. Ver specs/partnership-results → Error Scenarios.
 */
export const MAX_RESULT_METRIC = 2_000_000_000;

export class CreatePartnershipResultDto {
  @ApiProperty({ example: 'uuid-da-candidatura' })
  @IsUUID()
  applicationId: string;

  @ApiPropertyOptional({ example: 12400, description: 'Contas alcançadas' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_RESULT_METRIC)
  reach?: number;

  @ApiPropertyOptional({ example: 18900, description: 'Impressões' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_RESULT_METRIC)
  impressions?: number;

  @ApiPropertyOptional({ example: 37, description: 'Cupons usados' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_RESULT_METRIC)
  couponsUsed?: number;

  @ApiPropertyOptional({ example: 'Melhor entrega da campanha.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  /**
   * Consentimento da marca pra este resultado aparecer no perfil público da
   * creator. Ausente = `false` (o default da coluna): publicar é escolha
   * ativa, nunca efeito colateral de registrar.
   */
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  brandAllowsPublic?: boolean;
}
