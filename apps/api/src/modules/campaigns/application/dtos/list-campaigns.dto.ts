import { IsOptional, IsInt, Min, IsEnum, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RewardType } from '@prisma/client';

export class ListCampaignsDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({
    example: 'fitness,wellness',
    description: 'Nichos separados por vírgula',
  })
  @IsOptional()
  @IsString()
  niches?: string;

  @ApiPropertyOptional({ enum: RewardType })
  @IsOptional()
  @IsEnum(RewardType)
  rewardType?: RewardType;
}
