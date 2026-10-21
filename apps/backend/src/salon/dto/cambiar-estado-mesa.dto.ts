import { IsEnum } from 'class-validator';
import { EstadoMesa } from '@prisma/client';

export class CambiarEstadoMesaDto {
  @IsEnum(EstadoMesa)
  estado: EstadoMesa;
}
