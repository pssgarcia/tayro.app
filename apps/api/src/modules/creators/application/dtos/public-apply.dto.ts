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

  @ApiProperty({ example: 'Ana Fitness' })
  @IsString()
  @IsNotEmpty({ message: 'Nome obrigatório' })
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: '(11) 91234-5678' })
  @IsString()
  @IsNotEmpty({ message: 'Telefone obrigatório' })
  @MaxLength(20)
  @Matches(/^[0-9()+\-\s]{8,20}$/, {
    message: 'Telefone inválido — use apenas números, espaços, ( ) - ou +',
  })
  phone: string;

  @ApiPropertyOptional({ example: 'Já uso os produtos e adoraria colaborar!' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;
}
