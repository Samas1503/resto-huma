import { IsNotEmpty, IsString } from 'class-validator';

// Contrato: GoogleAuthDto (packages/shared contracts/usuarios.ts)
export class GoogleAuthDto {
  @IsString()
  @IsNotEmpty()
  idToken: string;
}
