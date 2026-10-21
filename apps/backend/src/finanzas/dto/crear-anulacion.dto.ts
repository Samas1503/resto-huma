import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

// Anulación de una venta cobrada (glosario): revierte pago(s) y opcionalmente repone stock.
// Requiere pagoId (un pago puntual) o pedidoId (toda la venta); al menos uno.
export class CrearAnulacionDto {
  @IsOptional()
  @IsString()
  pagoId?: string;

  @IsOptional()
  @IsString()
  pedidoId?: string;

  @IsString()
  @IsNotEmpty()
  motivo!: string;

  @IsOptional()
  @IsBoolean()
  reponeStock?: boolean = true;
}
