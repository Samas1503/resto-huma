// Tipos locales de payloads de la API admin (espejo de los services NestJS).
// Los campos Decimal de Prisma (precioUsd, costoUnitario, stockActual, valor,
// cantidad) se serializan como string → se tipan como `DecimalValue` y se
// muestran con `dec()`.
import type {
  CategoriaProducto,
  EstadoMesa,
  EstadoReserva,
  Rol,
  TipoMovimientoStock,
  TipoPromocion,
} from '@resto-huma/shared';

export type DecimalValue = number | string;

export function dec(v: DecimalValue | null | undefined): number {
  return Number(v ?? 0);
}

export function formatUsd(v: DecimalValue | null | undefined): string {
  return `u$s ${dec(v).toFixed(2)}`;
}

// ─── Menú ────────────────────────────────────────────────────
export interface VariedadApi {
  id: string;
  productoId: string;
  nombre: string;
  precioArs: number | null;
  precioUsd: DecimalValue | null;
  disponible: boolean;
}

export interface ProductoApi {
  id: string;
  nombre: string;
  categoria: CategoriaProducto;
  precioArs: number;
  precioUsd: DecimalValue;
  disponible: boolean;
  activo: boolean;
  variedades: VariedadApi[];
}

// ─── Promociones ─────────────────────────────────────────────
export interface PromocionProductoApi {
  id: string;
  productoId: string;
  variedadId: string | null;
  producto: { id: string; nombre: string };
  variedad: { id: string; nombre: string } | null;
}

export interface PromocionApi {
  id: string;
  nombre: string;
  tipo: TipoPromocion;
  valor: DecimalValue;
  fechaInicio: string | null;
  fechaFin: string | null;
  activa: boolean;
  productos: PromocionProductoApi[];
}

// ─── Insumos / stock / recetas ───────────────────────────────
export interface InsumoApi {
  id: string;
  nombre: string;
  unidadMedida: string;
  stockMinimo: DecimalValue;
  costoUnitario: DecimalValue;
  stockActual: DecimalValue;
}

export interface MovimientoApi {
  id: string;
  insumoId: string;
  tipo: TipoMovimientoStock;
  cantidad: DecimalValue;
  motivo: string | null;
  createdAt: string;
  insumo: InsumoApi;
  usuario: { id: string; nombre: string; rol: Rol };
}

export interface RecetaItemApi {
  id: string;
  productoId: string;
  variedadId: string | null;
  insumoId: string;
  cantidad: DecimalValue;
  insumo: InsumoApi;
  variedad: { id: string; nombre: string } | null;
}

// ─── Usuarios ────────────────────────────────────────────────
export interface UsuarioApi {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
}

// ─── Reservas / mesas ────────────────────────────────────────
export interface ReservaApi {
  id: string;
  mesaId: string;
  clienteId: string | null;
  fechaHora: string;
  cantidadPersonas: number;
  telefonoContacto: string;
  notas: string | null;
  estado: EstadoReserva;
  cliente: { id: string; nombre: string; telefono: string | null } | null;
  mesa: { id: string; numero: number; zona: string | null; capacidad: number };
}

export interface MesaApi {
  id: string;
  numero: number;
  capacidad: number;
  zona: string | null;
  estado: EstadoMesa;
}
