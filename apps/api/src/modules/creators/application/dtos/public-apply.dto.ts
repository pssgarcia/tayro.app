import {
  IsString,
  IsEmail,
  IsOptional,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { INSTAGRAM_HANDLE_FORMAT } from '../../../../shared/validation/instagram-handle';

export class PublicApplyDto {
  @ApiProperty({ example: 'anafitness' })
  @IsString()
  @MaxLength(30)
  @Matches(INSTAGRAM_HANDLE_FORMAT, {
    message:
      'Handle inválido — sem @, apenas letras, números, pontos e underscores',
  })
  @Transform(({ value }) =>
    (value as string).replace(/^@+/, '').toLowerCase().trim(),
  )
  igHandle: string;

  @ApiProperty({ example: 'ana@email.com' })
  @IsEmail({}, { message: 'E-mail inválido' })
  @MaxLength(254)
  email: string;

  @ApiPropertyOptional({ example: 'Ana Fitness' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'Já uso os produtos e adoraria colaborar!' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;
}
