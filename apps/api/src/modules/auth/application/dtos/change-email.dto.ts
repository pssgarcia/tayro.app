import { IsEmail, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangeEmailDto {
  @ApiProperty({ example: 'novo@exemplo.com' })
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({ example: 'senhaAtual123' })
  @IsString()
  @MaxLength(72) // limite do bcrypt — acima disso a senha seria truncada
  password: string;
}
