import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import type { EstadoCobroPasarela, WebhookPagoPayload } from '@resto-huma/shared';

// DTO validado del contrato WebhookPagoPayload (shared/contracts/finanzas.ts).
export class WebhookPagoDto implements WebhookPagoPayload {
  @IsString()
  @IsNotEmpty()
  referenciaExterna!: string;

  @IsIn(['aprobado', 'rechazado', 'pendiente'])
  estado!: EstadoCobroPasarela;

  /** HMAC-SHA256 hex de `${referenciaExterna}.${estado}` con PAYMENT_WEBHOOK_SECRET. */
  @IsString()
  @IsNotEmpty()
  firma!: string;
}
