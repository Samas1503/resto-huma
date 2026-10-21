// Etiquetas en español y tonos de Badge para los enums del dominio (GLOSARIO.MD).
// Las transiciones espejan TRANSICIONES de pedidos.service.ts (backend).
import type {
  Canal,
  EstadoAtencion,
  EstadoComanda,
  EstadoPago,
  MedioPago,
  Presentacion,
  Subtipo,
} from '@resto-huma/shared';

type Tone = 'neutral' | 'green' | 'amber' | 'red' | 'blue' | 'violet';

export const ESTADO_ATENCION_LABEL: Record<EstadoAtencion, string> = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  en_preparacion: 'En preparación',
  listo: 'Listo',
  en_reparto: 'En reparto',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

export const ESTADO_ATENCION_TONE: Record<EstadoAtencion, Tone> = {
  pendiente: 'amber',
  confirmado: 'blue',
  en_preparacion: 'violet',
  listo: 'green',
  en_reparto: 'blue',
  entregado: 'neutral',
  cancelado: 'red',
};

export const ESTADO_PAGO_LABEL: Record<EstadoPago, string> = {
  pendiente_de_cobro: 'Pendiente de cobro',
  cobrado: 'Cobrado',
};

export const ESTADO_PAGO_TONE: Record<EstadoPago, Tone> = {
  pendiente_de_cobro: 'amber',
  cobrado: 'green',
};

export const ESTADO_COMANDA_LABEL: Record<EstadoComanda, string> = {
  pendiente: 'Pendiente',
  en_preparacion: 'En preparación',
  lista: 'Lista',
  anulada: 'Anulada',
};

export const ESTADO_COMANDA_TONE: Record<EstadoComanda, Tone> = {
  pendiente: 'amber',
  en_preparacion: 'violet',
  lista: 'green',
  anulada: 'red',
};

export const CANAL_LABEL: Record<Canal, string> = {
  presencial: 'Presencial',
  virtual: 'Virtual',
};

export const SUBTIPO_LABEL: Record<Subtipo, string> = {
  mesa: 'Mesa',
  mostrador: 'Mostrador',
  takeaway: 'Para llevar',
  delivery: 'Delivery',
};

export const MEDIO_PAGO_LABEL: Record<MedioPago, string> = {
  efectivo: 'Efectivo',
  debito: 'Débito',
  credito: 'Crédito',
  transferencia: 'Transferencia',
  billetera_virtual: 'Billetera virtual',
};

export const PRESENTACION_LABEL: Record<Presentacion, string> = {
  unidad: 'unidad',
  docena: 'docena',
  media_docena: 'media docena',
};

// Estados que se consideran "activos" en la bandeja (aún en atención).
export const ESTADOS_ACTIVOS: readonly EstadoAtencion[] = [
  'pendiente',
  'confirmado',
  'en_preparacion',
  'listo',
  'en_reparto',
];

// Ciclo de atención — espejo de TRANSICIONES del backend.
export const TRANSICIONES: Record<EstadoAtencion, readonly EstadoAtencion[]> = {
  pendiente: ['confirmado', 'cancelado'],
  confirmado: ['en_preparacion', 'cancelado'],
  en_preparacion: ['listo', 'cancelado'],
  listo: ['en_reparto', 'entregado', 'cancelado'],
  en_reparto: ['entregado', 'cancelado'],
  entregado: [],
  cancelado: [],
};

export const ACCION_LABEL: Record<EstadoAtencion, string> = {
  confirmado: 'Confirmar',
  en_preparacion: 'Iniciar preparación',
  listo: 'Marcar listo',
  en_reparto: 'Salir a reparto',
  entregado: 'Marcar entregado',
  cancelado: 'Cancelar',
  pendiente: 'Volver a pendiente',
};
