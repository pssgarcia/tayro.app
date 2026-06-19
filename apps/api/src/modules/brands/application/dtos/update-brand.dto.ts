import {
  IsString,
  IsOptional,
  IsArray,
  ArrayMaxSize,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBrandDto {
  @ApiPropertyOptional({ example: 'Minha Marca Fitness' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'https://cdn.exemplo.com/logo.png' })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  logoUrl?: string;

  @ApiPropertyOptional({ example: ['fitness', 'wellness'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  niches?: string[];

  @ApiPropertyOptional({ example: 'https://minhamarca.com' })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  website?: string;

  @ApiPropertyOptional({
    example: 'Marca de suplementos focada em creators fitness.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;
}
