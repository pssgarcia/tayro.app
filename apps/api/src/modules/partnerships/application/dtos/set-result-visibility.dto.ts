import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Controle da CREATOR sobre o próprio perfil público, resultado a resultado.
 * `hidden: true` esconde só este; o interruptor geral continua sendo o
 * `publicProfileEnabled` do perfil dela (D-06).
 */
export class SetResultVisibilityDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  hidden: boolean;
}
