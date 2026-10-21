import { IsEnum } from 'class-validator';
import { TipoTurno } from '@prisma/client';

// Contrato: AbrirTurnoDto (packages/shared contracts/salon.ts)
export class AbrirTurnoDto {
  @IsEnum(TipoTurno)
  tipo: TipoTurno;
}
