import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsString, MaxLength, Min } from 'class-validator';
import { CategoriaProducto } from '@prisma/client';

// Contrato: packages/shared/contracts/menu.ts → CrearProductoDto
export class CreateProductoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombre!: string;

  @IsEnum(CategoriaProducto)
  categoria!: CategoriaProducto;

  // ARS entero (nunca float)
  @IsInt()
  @Min(0)
  precioArs!: number;

  // USD con máximo 2 decimales; se persiste como Decimal(12,2)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precioUsd!: number;
}
