import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import type { CrearInsumoDto } from '@resto-huma/shared';

// Espejo validado de CrearInsumoDto (packages/shared, contrato congelado)
export class CrearInsumoBodyDto implements CrearInsumoDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  unidadMedida: string;

  @IsNumber()
  @Min(0)
  stockMinimo: number;

  @IsNumber()
  @Min(0)
  costoUnitario: number;
}

// stockActual no es editable por API: solo se mueve vía MovimientoStock
export class ActualizarInsumoBodyDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nombre?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  unidadMedida?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stockMinimo?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costoUnitario?: number;
}
