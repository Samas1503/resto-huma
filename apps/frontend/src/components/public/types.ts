// Tipos de runtime del portal público. La carta devuelve entidades Prisma
// serializadas (Decimal → string; overrides de Variedad → null), por eso no se
// reusan tal cual los DTO de packages/shared.
import type { CategoriaProducto, EstadoAtencion, Presentacion } from '@resto-huma/shared';

export interface CartaVariedad {
  id: string;
  nombre: string;
  precioArs: number | null;
  precioUsd: string | number | null;
  disponible: boolean;
}

export interface CartaProducto {
  id: string;
  nombre: string;
  categoria: CategoriaProducto;
  precioArs: number;
  precioUsd: string | number | null;
  variedades: CartaVariedad[];
}

export interface PromocionVigente {
  id: string;
  nombre: string;
  tipo: string;
  valor: string | number;
  fechaInicio: string | null;
  fechaFin: string | null;
}

// Precio efectivo de un ítem: override de la variedad o base del producto
// (misma regla que PedidosService.resolveItems).
export function precioArsDe(producto: CartaProducto, variedad?: CartaVariedad): number {
  return variedad?.precioArs ?? producto.precioArs;
}

export function precioUsdDe(
  producto: CartaProducto,
  variedad?: CartaVariedad,
): string | number | null {
  return variedad?.precioUsd ?? producto.precioUsd;
}

export const CATEGORIA_ORDEN: CategoriaProducto[] = [
  'empanada',
  'plato_regional',
  'bebida',
  'postre',
];

export const CATEGORIA_LABELS: Record<CategoriaProducto, string> = {
  empanada: 'Empanadas',
  plato_regional: 'Platos regionales',
  bebida: 'Bebidas',
  postre: 'Postres',
};

export const PRESENTACION_LABELS: Record<Presentacion, string> = {
  unidad: 'Por unidad',
  media_docena: 'Media docena',
  docena: 'Docena',
};

// Ciclo de atención del pedido virtual (GLOSARIO.MD). Delivery suma en_reparto.
export const ESTADO_ORDEN: EstadoAtencion[] = [
  'pendiente',
  'confirmado',
  'en_preparacion',
  'listo',
  'en_reparto',
  'entregado',
];

export const ESTADO_LABELS: Record<EstadoAtencion, string> = {
  pendiente: 'Recibido',
  confirmado: 'Confirmado',
  en_preparacion: 'En preparación',
  listo: 'Listo',
  en_reparto: 'En reparto',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

export function formatUsd(precioUsd: string | number | null | undefined): string {
  if (precioUsd === null || precioUsd === undefined) return '';
  return `US$ ${Number(precioUsd).toFixed(2)}`;
}
