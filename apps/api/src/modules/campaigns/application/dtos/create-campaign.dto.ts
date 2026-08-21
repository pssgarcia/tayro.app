import {
  IsString,
  IsOptional,
  IsArray,
  IsInt,
  IsNumber,
  Min,
  Max,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OfferType, RewardType } from '@prisma/client';

export class CreateCampaignDto {
  @ApiProperty({ example: 'Campanha Verão Fitness 2026' })
  @IsString()
  title: string;

  @ApiProperty({
    example: 'Preciso de conteúdo mostrando uso do produto no treino.',
  })
  @IsString()
  description: string;

  @ApiPropertyOptional({ example: 'https://drive.google.com/brief.pdf' })
  @IsOptional()
  @IsString()
  briefUrl?: string;

  @ApiProperty({ example: ['fitness', 'wellness'] })
  @IsArray()
  @IsString({ each: true })
  niches: string[];

  @ApiProperty({ example: 5, description: 'Número máximo de vagas' })
  @IsInt()
  @Min(1)
  maxSpots: number;

  @ApiPropertyOptional({ example: '2026-08-31' })
  @IsOptional()
  @IsDateString()
  deadline?: string;

  // ─── Oferta (fonte de verdade) ─────────────────────────────────────────────

  @ApiPropertyOptional({ enum: OfferType })
  @IsOptional()
  @IsEnum(OfferType)
  offerType?: OfferType;

  @ApiPropertyOptional({
    example: 30000,
    description: 'Valor em centavos (30000 = R$300)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  offerAmount?: number;

  @ApiPropertyOptional({
    example: 15,
    description: 'Dias para pagamento/envio após aprovação',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  offerDeadlineDays?: number;

  @ApiPropertyOptional({ example: 'Kit Whey 900g + coqueteleira' })
  @IsOptional()
  @IsString()
  offerDescription?: string;

  @ApiPropertyOptional({
    example: 10,
    description: 'Percentual de comissão por venda (ex: 10 = 10%)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(100)
  offerCommissionPercent?: number;

  // ─── DEPRECATED — mantidos para não quebrar registros antigos ─────────────

  @ApiPropertyOptional({ enum: RewardType })
  @IsOptional()
  @IsEnum(RewardType)
  rewardType?: RewardType;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  rewardValue?: string;
}
