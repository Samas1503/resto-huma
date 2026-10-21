import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, NotEquals } from 'class-validator';
import type { MovimientoStockDto, TipoMovimientoStock } from '@resto-huma/shared';

// Solo entradas/salidas manuales por API; descuento_pedido, reposicion_cancelacion
// y anulacion los genera el sistema (confirmación de pedido / anulación de venta)
const TIPOS_MANUALES: TipoMovimientoStock[] = ['compra', 'ajuste_manual'];

export class CrearMovimientoStockBodyDto implements MovimientoStockDto {
  @IsString()
  @IsNotEmpty()
  insumoId: string;

  @IsIn(TIPOS_MANUALES)
  tipo: TipoMovimientoStock;

  // Signo con semántica: positivo = entrada, negativo = salida
  @IsNumber()
  @NotEquals(0)
  cantidad: number;

  @IsOptional()
  @IsString()
  motivo?: string;
}
