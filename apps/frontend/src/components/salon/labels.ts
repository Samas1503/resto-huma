// Etiquetas en español y tonos de Badge para los enums de dominio del salón.
import type { ComponentProps } from 'react';
import type {
  CategoriaProducto,
  EstadoAtencion,
  EstadoComanda,
  EstadoMesa,
  EstadoPago,
  EstadoReserva,
  Presentacion,
  ProductoDto,
} from '@resto-huma/shared';
import type { Badge } from '@/components/ui/badge';

type Tone = NonNullable<ComponentProps<typeof Badge>['tone']>;

export const MESA_LABEL: Record<EstadoMesa, string> = {
  libre: 'Libre',
  ocupada: 'Ocupada',
  cuenta_pedida: 'Cuenta pedida',
};
export const MESA_TONE: Record<EstadoMesa, Tone> = {
  libre: 'neutral',
  ocupada: 'green',
  cuenta_pedida: 'amber',
};

export const RESERVA_LABEL: Record<EstadoReserva, string> = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  cancelada: 'Cancelada',
  cumplida: 'Cumplida',
  no_show: 'No vino',
};
export const RESERVA_TONE: Record<EstadoReserva, Tone> = {
  pendiente: 'amber',
  confirmada: 'blue',
  cancelada: 'neutral',
  cumplida: 'green',
  no_show: 'red',
};

export const COMANDA_LABEL: Record<EstadoComanda, string> = {
  pendiente: 'Pendiente',
  en_preparacion: 'En preparación',
  lista: 'Lista',
  anulada: 'Anulada',
};
export const COMANDA_TONE: Record<EstadoComanda, Tone> = {
  pendiente: 'amber',
  en_preparacion: 'blue',
  lista: 'green',
  anulada: 'red',
};

export const ATENCION_LABEL: Record<EstadoAtencion, string> = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  en_preparacion: 'En preparación',
  listo: 'Listo',
  en_reparto: 'En reparto',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};
export const ATENCION_TONE: Record<EstadoAtencion, Tone> = {
  pendiente: 'amber',
  confirmado: 'blue',
  en_preparacion: 'violet',
  listo: 'green',
  en_reparto: 'blue',
  entregado: 'neutral',
  cancelado: 'red',
};

export const PAGO_LABEL: Record<EstadoPago, string> = {
  pendiente_de_cobro: 'Pendiente de cobro',
  cobrado: 'Cobrado',
};
export const PAGO_TONE: Record<EstadoPago, Tone> = {
  pendiente_de_cobro: 'amber',
  cobrado: 'green',
};

export const PRESENTACION_LABEL: Record<Presentacion, string> = {
  unidad: 'Unidad',
  docena: 'Docena',
  media_docena: 'Media docena',
};

export const CATEGORIA_LABEL: Record<CategoriaProducto, string> = {
  empanada: 'Empanadas',
  plato_regional: 'Platos regionales',
  bebida: 'Bebidas',
  postre: 'Postres',
};

// Precio vigente de una variedad: override propio o precio base del producto.
export function precioVariedadArs(
  producto: ProductoDto,
  variedadId: string | null | undefined,
): number {
  if (!variedadId) return producto.precioArs;
  const variedad = producto.variedades.find((v) => v.id === variedadId);
  return variedad?.precioArs ?? producto.precioArs;
}

// Nombre legible de un ítem a partir del catálogo ("Empanada · Carne").
export function productoLabel(
  productos: ProductoDto[],
  productoId: string,
  variedadId?: string | null,
): string {
  const producto = productos.find((p) => p.id === productoId);
  if (!producto) return 'Producto';
  if (!variedadId) return producto.nombre;
  const variedad = producto.variedades.find((v) => v.id === variedadId);
  return variedad ? `${producto.nombre} · ${variedad.nombre}` : producto.nombre;
}
