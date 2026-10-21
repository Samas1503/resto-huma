import { MedioPago } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

// Espejo validado de CrearPagoDto (shared/contracts/finanzas.ts).
// Pago mixto: un pedido admite N pagos parciales con medios distintos.
export class CrearPagoDto {
  @IsString()
  @IsNotEmpty()
  pedidoId!: string;

  /** Monto del pago parcial en ARS entero (sin propina). */
  @IsInt()
  @Min(1)
  montoArs!: number;

  @IsEnum(MedioPago)
  medioPago!: MedioPago;

  /** Propina voluntaria en ARS entero; no cuenta para saldar la cuenta. */
  @IsOptional()
  @IsInt()
  @Min(0)
  propinaArs?: number;
}
