import { IsUUID, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateApplicationDto {
  @ApiProperty({ example: 'uuid-da-campanha' })
  @IsUUID()
  campaignId: string;

  @ApiPropertyOptional({ example: 'Tenho experiência com conteúdo fitness e 10k seguidores.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;
}
