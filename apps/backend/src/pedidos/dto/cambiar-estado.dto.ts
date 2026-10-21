import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EstadoAtencion, EstadoComanda } from '@prisma/client';
import type {
  CambiarEstadoAtencionDto as CambiarEstadoAtencionContract,
  CambiarEstadoComandaDto as CambiarEstadoComandaContract,
} from '@resto-huma/shared';

export class CambiarEstadoAtencionDto implements CambiarEstadoAtencionContract {
  @IsEnum(EstadoAtencion)
  estado: EstadoAtencion;

  @IsOptional()
  @IsString()
  motivoCancelacion?: string;
}

export class CambiarEstadoComandaDto implements CambiarEstadoComandaContract {
  @IsEnum(EstadoComanda)
  estado: EstadoComanda;
}
