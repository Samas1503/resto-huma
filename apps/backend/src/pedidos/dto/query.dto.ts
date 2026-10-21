import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Canal, EstadoAtencion, EstadoComanda, EstadoPago, Subtipo } from '@prisma/client';

export class ListarPedidosQueryDto {
  @IsOptional()
  @IsEnum(Canal)
  canal?: Canal;

  @IsOptional()
  @IsEnum(Subtipo)
  subtipo?: Subtipo;

  @IsOptional()
  @IsEnum(EstadoAtencion)
  estadoAtencion?: EstadoAtencion;

  @IsOptional()
  @IsEnum(EstadoPago)
  estadoPago?: EstadoPago;

  @IsOptional()
  @IsString()
  mesaId?: string;

  @IsOptional()
  @IsString()
  clienteId?: string;
}

export class ListarComandasQueryDto {
  @IsOptional()
  @IsEnum(EstadoComanda)
  estado?: EstadoComanda;
}
