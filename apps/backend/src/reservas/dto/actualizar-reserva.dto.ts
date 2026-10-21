import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { EstadoReserva } from '@prisma/client';

export class ActualizarReservaDto {
  @IsString()
  @IsOptional()
  clienteId?: string;

  @IsString()
  @IsOptional()
  mesaId?: string;

  @IsDateString()
  @IsOptional()
  fechaHora?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  cantidadPersonas?: number;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  telefonoContacto?: string;

  @IsEnum(EstadoReserva)
  @IsOptional()
  estado?: EstadoReserva;

  @IsString()
  @IsOptional()
  notas?: string;
}
