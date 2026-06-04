import { IsEmail, IsString, MinLength, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterBrandDto {
  @ApiProperty({ example: 'marca@exemplo.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'senhaSegura123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Minha Marca Fitness' })
  @IsString()
  brandName: string;

  @ApiPropertyOptional({ example: ['fitness', 'wellness'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  niches?: string[];

  @ApiPropertyOptional({ example: 'https://minhamarca.com' })
  @IsOptional()
  @IsString()
  website?: string;
}
