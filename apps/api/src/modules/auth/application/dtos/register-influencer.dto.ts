import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsArray,
  ArrayMaxSize,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterInfluencerDto {
  @ApiProperty({ example: 'influencer@exemplo.com' })
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({ example: 'senhaSegura123', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(72) // limite do bcrypt — acima disso a senha seria truncada
  password: string;

  @ApiProperty({ example: 'Ana Silva' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'anasilva' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Transform(({ value }) =>
    value ? (value as string).replace(/^@+/, '').toLowerCase().trim() : value,
  )
  instagramHandle?: string;

  @ApiPropertyOptional({ example: ['fitness', 'lifestyle'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  niches?: string[];
}
