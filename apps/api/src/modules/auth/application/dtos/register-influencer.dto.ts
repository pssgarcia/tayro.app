import { IsEmail, IsString, MinLength, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterInfluencerDto {
  @ApiProperty({ example: 'influencer@exemplo.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'senhaSegura123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Ana Silva' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: '@anasilva' })
  @IsOptional()
  @IsString()
  instagramHandle?: string;

  @ApiPropertyOptional({ example: ['fitness', 'lifestyle'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  niches?: string[];
}
