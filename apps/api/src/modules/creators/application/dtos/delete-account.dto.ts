import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteAccountDto {
  @ApiProperty({ example: 'senhaAtual123' })
  @IsString()
  @MaxLength(72) // limite do bcrypt — acima disso a senha seria truncada
  password: string;
}
