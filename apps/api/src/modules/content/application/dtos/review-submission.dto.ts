import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ReviewSubmissionDto {
  @ApiPropertyOptional({ example: 'Ótimo conteúdo! Aprovado.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  feedback?: string;
}
