// Puerto PasarelaPago — re-exporta el contrato congelado de
// packages/shared/src/contracts/finanzas.ts (import type: el paquete publica
// fuentes .ts; los tipos se borran al compilar y no hay dependencia en runtime).
import type {
  EstadoCobroPasarela,
  PasarelaPago,
  ProveedorPasarela,
  ResultadoConfirmarCobro,
  ResultadoIniciarCobro,
} from '@resto-huma/shared';

export type {
  EstadoCobroPasarela,
  PasarelaPago,
  ProveedorPasarela,
  ResultadoConfirmarCobro,
  ResultadoIniciarCobro,
};

/** Token DI del adaptador activo (PAYMENT_PROVIDER=manual|externa, ver pagos.module.ts). */
export const PASARELA_PAGO = 'PASARELA_PAGO';

/**
 * Extensión local del puerto: indica si el cobro queda pendiente hasta la
 * confirmación de la pasarela (webhook). manual=false (el pago se registra y
 * confirma en el acto); externa=true (espera POST /pagos/webhook firmado).
 */
export interface PasarelaPagoAdapter extends PasarelaPago {
  readonly pendienteConfirmacion: boolean;
}
