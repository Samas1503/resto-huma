import { IsNotEmpty, IsString } from 'class-validator';

// Contrato: AsignarMozoMesaDto (packages/shared contracts/salon.ts)
export class AsignarMozoMesaDto {
  @IsString()
  @IsNotEmpty()
  usuarioId: string;

  @IsString()
  @IsNotEmpty()
  mesaId: string;
}
