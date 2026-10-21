import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import type { RecetaItemDto } from '@resto-huma/shared';

// Receta mixta: variedadId null = insumo base del producto; set = ajuste por variedad
export class CrearRecetaItemBodyDto implements RecetaItemDto {
  @IsString()
  @IsNotEmpty()
  productoId: string;

  @IsOptional()
  @IsString()
  variedadId?: string;

  @IsString()
  @IsNotEmpty()
  insumoId: string;

  // En unidadMedida del insumo, por unidad de producto
  @IsNumber()
  @IsPositive()
  cantidad: number;
}

export class ActualizarRecetaItemBodyDto {
  @IsOptional()
  @IsString()
  variedadId?: string;

  @IsOptional()
  @IsString()
  insumoId?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  cantidad?: number;
}
