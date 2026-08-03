import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ClaimAccountDto {
  @ApiProperty({ example: 'a1b2c3...' })
  @IsString()
  @MaxLength(128)
  token: string;

  @ApiProperty({ example: 'senhaSegura123', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(72) // limite do bcrypt — acima disso a senha seria truncada
  password: string;
}
