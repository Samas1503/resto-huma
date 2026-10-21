// Tipos espejo de los payloads del backend (finanzas/caja, pedidos) que no
// están en los contratos congelados de @resto-huma/shared (response shapes
// Prisma, no DTOs de entrada).
import type {
  CategoriaEgreso,
  EstadoCaja,
  MedioPago,
  PedidoDto,
  TipoTurno,
} from '@resto-huma/shared';

/** GET /caja/actual — prisma.caja.findFirst con turno + abiertaPor. */
export interface CajaActual {
  id: string;
  turnoId: string;
  estado: EstadoCaja;
  montoInicialArs: number;
  apertura: string;
  turno: { id: string; tipo: TipoTurno; apertura: string; cierre: string | null };
  abiertaPor: { id: string; nombre: string };
}

/** GET /caja/:id/resumen — CajaService.resumen(). */
export interface ResumenCaja {
  caja: CajaActual & { cierre: unknown | null };
  ingresos: {
    totalArs: number;
    propinasArs: number;
    cantidadPagos: number;
    porMedio: Partial<Record<MedioPago, number>>;
  };
  egresos: {
    totalArs: number;
    cantidad: number;
    porCategoria: Partial<Record<CategoriaEgreso, number>>;
  };
  esperadoEfectivoArs: number;
}

/** POST /caja/cerrar — CierreCaja creado. */
export interface CierreCajaResult {
  id: string;
  cajaId: string;
  cerradoPorId: string;
  ingresosEsperadosArs: number;
  egresosEsperadosArs: number;
  dineroFisicoArs: number;
  diferenciaArs: number;
  createdAt: string;
}

/** GET /finanzas/pagos — Pago con registradoPor + anulaciones. */
export interface PagoRow {
  id: string;
  pedidoId: string;
  cajaId: string;
  montoArs: number;
  medioPago: MedioPago;
  propinaArs: number;
  referenciaExterna: string | null;
  createdAt: string;
  registradoPor: { id: string; nombre: string };
  anulaciones: { id: string; motivo: string; createdAt: string }[];
}

/** POST /finanzas/pagos — pago creado + estado de cobro recalculado. */
export interface RegistrarPagoResult {
  pago: PagoRow;
  cobrado: boolean;
  totalArs: number;
  pagadoArs: number;
  restanteArs: number;
}

/** POST /pagos/cobros — ResultadoIniciarCobro de la pasarela activa. */
export interface IniciarCobroResult {
  referenciaExterna: string;
  checkoutUrl?: string;
}

/** GET /finanzas/egresos — Egreso con usuario. */
export interface EgresoRow {
  id: string;
  cajaId: string;
  categoria: CategoriaEgreso;
  montoArs: number;
  descripcion: string;
  createdAt: string;
  usuario: { id: string; nombre: string };
}

// Etiquetas de enums en español (strings visibles al usuario).
export const MEDIO_PAGO_LABEL: Record<MedioPago, string> = {
  efectivo: 'Efectivo',
  debito: 'Débito',
  credito: 'Crédito',
  transferencia: 'Transferencia',
  billetera_virtual: 'Billetera virtual',
};

export const CATEGORIA_EGRESO_LABEL: Record<CategoriaEgreso, string> = {
  compra_insumos: 'Compra de insumos',
  sueldos: 'Sueldos',
  servicios: 'Servicios',
  alquiler: 'Alquiler',
  otros: 'Otros',
};

export const SUBTIPO_LABEL: Record<PedidoDto['subtipo'], string> = {
  mesa: 'Mesa',
  mostrador: 'Mostrador',
  takeaway: 'Para llevar',
  delivery: 'Delivery',
};

/**
 * Total del pedido en ARS: ítems + envío. El backend además resta
 * DescuentoAplicado (fuera del PedidoDto), así que tras el primer
 * POST /finanzas/pagos la respuesta trae el totalArs autoritativo.
 */
export function totalPedidoArs(pedido: PedidoDto): number {
  return pedido.items.reduce((acc, i) => acc + i.subtotalArs, 0) + pedido.costoEnvioArs;
}

/** Pagos vigentes (sin anulación) de un pedido. */
export function pagosVigentes(pagos: PagoRow[]): PagoRow[] {
  return pagos.filter((p) => p.anulaciones.length === 0);
}

export function shortId(id: string): string {
  return `#${id.slice(-6).toUpperCase()}`;
}
