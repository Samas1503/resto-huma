import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

// Contrato: LoginDto (packages/shared contracts/usuarios.ts)
export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
