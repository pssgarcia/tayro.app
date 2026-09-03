import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  ArrayMaxSize,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  PHONE_FORMAT_OR_EMPTY,
  PHONE_FORMAT_MESSAGE,
  PHONE_MAX_LENGTH,
} from '../../../../shared/validation/phone';

// Perfil do creator autenticado. instagramHandle NÃO é editável aqui —
// é a chave do perfil público e dirige o cache do IG; fica num fluxo dedicado.
export class UpdateInfluencerDto {
  @ApiPropertyOptional({ example: 'Ana Silva' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    example: 'Creator fitness, foco em treino funcional.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional({ example: 'Belo Horizonte' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  // String vazia é como a creator APAGA o telefone (o service converte pra
  // null) — por isso o formato aceita vazio, diferente do cadastro.
  @ApiPropertyOptional({ example: '(11) 91234-5678' })
  @IsOptional()
  @IsString()
  @MaxLength(PHONE_MAX_LENGTH)
  @Matches(PHONE_FORMAT_OR_EMPTY, { message: PHONE_FORMAT_MESSAGE })
  phone?: string;

  @ApiPropertyOptional({ example: 'https://cdn.exemplo.com/avatar.png' })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  avatarUrl?: string;

  @ApiPropertyOptional({ example: ['fitness', 'lifestyle'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  niches?: string[];

  @ApiPropertyOptional({ example: 'anafit' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  tiktokHandle?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Opt-in LGPD: expõe o perfil público em /c/:handle',
  })
  @IsOptional()
  @IsBoolean()
  publicProfileEnabled?: boolean;
}
