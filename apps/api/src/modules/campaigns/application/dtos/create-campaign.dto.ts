import { IsString, IsOptional, IsArray, IsInt, Min, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RewardType } from '@prisma/client';

export class CreateCampaignDto {
  @ApiProperty({ example: 'Campanha Verão Fitness 2026' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Preciso de conteúdo mostrando uso do produto no treino.' })
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

  @ApiProperty({ enum: RewardType, example: RewardType.MONETARY })
  @IsEnum(RewardType)
  rewardType: RewardType;

  @ApiProperty({ example: 'R$300 por post aprovado' })
  @IsString()
  rewardValue: string;

  @ApiPropertyOptional({ example: '2026-08-31' })
  @IsOptional()
  @IsDateString()
  deadline?: string;
}
