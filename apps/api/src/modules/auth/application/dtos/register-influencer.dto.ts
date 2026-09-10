import {
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
  IsArray,
  ArrayMaxSize,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { INSTAGRAM_HANDLE_FORMAT } from '../../../../shared/validation/instagram-handle';
import {
  PHONE_FORMAT,
  PHONE_FORMAT_MESSAGE,
  PHONE_MAX_LENGTH,
} from '../../../../shared/validation/phone';
import {
  AcceptedTermsAndPrivacyField,
  DeclaredAdultField,
} from '../../../../shared/legal/legal-acceptance.dto-fields';

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

  // Obrigatório, igual à candidatura pública: sem telefone a marca fica só
  // com o @ do Instagram como canal, que não é canal de resposta garantido.
  // Era a única porta de entrada de creator que não pedia telefone.
  @ApiProperty({ example: '(11) 91234-5678' })
  @IsString()
  @IsNotEmpty({ message: 'Telefone obrigatório' })
  @MaxLength(PHONE_MAX_LENGTH)
  @Matches(PHONE_FORMAT, { message: PHONE_FORMAT_MESSAGE })
  phone: string;

  // Obrigatório desde 2026-09-02. O @ é a chave de tudo que a creator ganha
  // aqui — media kit vivo, seguidores, engajamento, posts, perfil público em
  // /c/:handle. Cadastro sem ele criava uma conta que a marca via como
  // "Dados do Instagram indisponíveis" pra sempre.
  @ApiProperty({ example: 'anasilva' })
  @IsString()
  @IsNotEmpty({ message: '@ do Instagram obrigatório' })
  @MaxLength(30)
  @Matches(INSTAGRAM_HANDLE_FORMAT, {
    message:
      'Handle inválido: sem @, apenas letras, números, pontos e underscores',
  })
  @Transform(({ value }) =>
    value ? (value as string).replace(/^@+/, '').toLowerCase().trim() : value,
  )
  instagramHandle: string;

  @ApiPropertyOptional({ example: ['fitness', 'lifestyle'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  niches?: string[];

  @AcceptedTermsAndPrivacyField()
  acceptedTermsAndPrivacy: boolean;

  @DeclaredAdultField()
  declaredAdult: boolean;
}
