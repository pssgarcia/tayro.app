import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsArray,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterBrandDto {
  @ApiProperty({ example: 'marca@exemplo.com' })
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({ example: 'senhaSegura123', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(72) // limite do bcrypt — acima disso a senha seria truncada
  password: string;

  @ApiProperty({ example: 'Minha Marca Fitness' })
  @IsString()
  @MaxLength(100)
  brandName: string;

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
}
