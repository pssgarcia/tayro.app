import {
  IsString,
  IsEmail,
  IsOptional,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class PublicApplyDto {
  @ApiProperty({ example: 'anafitness' })
  @IsString()
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_.]{1,30}$/, {
    message:
      'Handle inválido — sem @, apenas letras, números, pontos e underscores',
  })
  @Transform(({ value }) =>
    (value as string).replace(/^@+/, '').toLowerCase().trim(),
  )
  igHandle: string;

  @ApiProperty({ example: 'ana@email.com' })
  @IsEmail({}, { message: 'E-mail inválido' })
  email: string;

  @ApiPropertyOptional({ example: 'Ana Fitness' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Já uso os produtos e adoraria colaborar!' })
  @IsOptional()
  @IsString()
  message?: string;
}
