import { IsEmail, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'usuario@exemplo.com' })
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({ example: 'senhaSegura123' })
  @IsString()
  @MaxLength(72) // limite do bcrypt — acima disso a senha seria truncada
  password: string;
}
