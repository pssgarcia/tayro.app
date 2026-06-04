import { IsUUID, IsEnum, IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RewardType } from '@prisma/client';

export class CreateRewardDto {
  @ApiProperty({ example: 'uuid-do-influencer' })
  @IsUUID()
  influencerId: string;

  @ApiProperty({ example: 'uuid-da-campanha' })
  @IsUUID()
  campaignId: string;

  @ApiProperty({ enum: RewardType })
  @IsEnum(RewardType)
  type: RewardType;

  @ApiProperty({ example: 'R$300' })
  @IsString()
  value: string;

  @ApiPropertyOptional({ example: 'Pix enviado em 04/06/2026' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
