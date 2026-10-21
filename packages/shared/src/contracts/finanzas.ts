import { MedioPago, CategoriaEgreso } from '../enums.js';

// ─── Puerto PasarelaPago (servicio externo — proyecto aparte) ──
export type ProveedorPasarela = 'manual' | 'externa';
export type EstadoCobroPasarela = 'aprobado' | 'rechazado' | 'pendiente';

export interface ResultadoIniciarCobro {
  referenciaExterna: string;
  checkoutUrl?: string;
}
export interface ResultadoConfirmarCobro { estado: EstadoCobroPasarela }

export interface PasarelaPago {
  iniciarCobro(pedidoId: string, montoArs: number): Promise<ResultadoIniciarCobro>;
  confirmarCobro(referenciaExterna: string): Promise<ResultadoConfirmarCobro>;
  reembolsar(pagoId: string): Promise<void>;
}

// ─── Payload webhook servicio externo ────────────────────────
export interface WebhookPagoPayload {
  referenciaExterna: string;
  estado: EstadoCobroPasarela;
  firma: string; // HMAC con PAYMENT_WEBHOOK_SECRET
}

// ─── DTOs finanzas ───────────────────────────────────────────
export interface CrearPagoDto {
  pedidoId: string;
  montoArs: number;
  medioPago: MedioPago;
  propinaArs?: number;
}
export interface PagoDto extends CrearPagoDto {
  id: string;
  cajaId: string;
  registradoPorId: string;
  referenciaExterna: string | null;
  createdAt: string;
}
export interface AbrirCajaDto { montoInicialArs: number }
export interface CerrarCajaDto { dineroFisicoArs: number }
export interface CrearEgresoDto {
  categoria: CategoriaEgreso;
  montoArs: number;
  descripcion: string;
}
