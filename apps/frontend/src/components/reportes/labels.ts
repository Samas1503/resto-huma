// Etiquetas es-AR para los enums de dominio que devuelven los reportes.
import type {
  Canal,
  CategoriaEgreso,
  MedioPago,
  Presentacion,
  Subtipo,
  TipoTurno,
} from '@resto-huma/shared';

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

export const TURNO_LABEL: Record<TipoTurno, string> = {
  almuerzo: 'Almuerzo',
  cena: 'Cena',
};

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

// Etiquetas cortas para la columna "por presentación" del ranking.
export const PRESENTACION_SHORT: Record<Presentacion, string> = {
  unidad: 'u',
  docena: 'doc',
  media_docena: '½ doc',
};
