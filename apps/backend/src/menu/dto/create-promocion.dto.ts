import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { TipoPromocion } from '@prisma/client';
import { AddPromocionProductoDto } from './add-promocion-producto.dto.js';

// Contrato: contracts/menu.ts → CrearPromocionDto
// Semántica de `valor` por tipo:
//   porcentaje   → % de descuento (0–100)
//   monto_fijo   → monto fijo de descuento en ARS
//   precio_combo → precio fijo del combo en ARS (lleva 1 unidad de cada producto listado)
//   nxm          → codificado N.MM: parte entera = unidades que lleva, decimales = unidades que paga
//                  (ej.: 3.02 = "3x2", 12.10 = "docena pagando 10")
export class CreatePromocionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombre!: string;

  @IsEnum(TipoPromocion)
  tipo!: TipoPromocion;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  valor!: number;

  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  // Composición inicial opcional; vacía/ausente = aplica a todo el menú
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AddPromocionProductoDto)
  productos?: AddPromocionProductoDto[];
}
