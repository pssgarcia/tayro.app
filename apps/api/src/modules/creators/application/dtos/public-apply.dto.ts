import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { INSTAGRAM_HANDLE_FORMAT } from '../../../../shared/validation/instagram-handle';
import {
  PHONE_FORMAT,
  PHONE_FORMAT_MESSAGE,
  PHONE_MAX_LENGTH,
} from '../../../../shared/validation/phone';

export class PublicApplyDto {
  @ApiProperty({ example: 'anafitness' })
  @IsString()
  @MaxLength(30)
  @Matches(INSTAGRAM_HANDLE_FORMAT, {
    message:
      'Handle inválido: sem @, apenas letras, números, pontos e underscores',
  })
  @Transform(({ value }) =>
    (value as string).replace(/^@+/, '').toLowerCase().trim(),
  )
  igHandle: string;

  @ApiProperty({ example: 'ana@email.com' })
  @IsEmail({}, { message: 'E-mail inválido' })
  @MaxLength(254)
  email: string;

  @ApiProperty({ example: 'Ana Fitness' })
  @IsString()
  @IsNotEmpty({ message: 'Nome obrigatório' })
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: '(11) 91234-5678' })
  @IsString()
  @IsNotEmpty({ message: 'Telefone obrigatório' })
  @MaxLength(PHONE_MAX_LENGTH)
  @Matches(PHONE_FORMAT, { message: PHONE_FORMAT_MESSAGE })
  phone: string;

  @ApiPropertyOptional({ example: 'Já uso os produtos e adoraria colaborar!' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;
}
