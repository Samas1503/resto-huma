import { Canal, Subtipo, EstadoAtencion, EstadoPago, EstadoComanda, Presentacion, OrigenComanda } from '../enums.js';

export interface ItemPedidoInput {
  productoId: string;
  variedadId?: string;
  cantidad: number;
  presentacion?: Presentacion;
  notas?: string;
}
export interface CrearPedidoDto {
  canal: Canal;
  subtipo: Subtipo;
  mesaId?: string;
  clienteId?: string;
  reservaId?: string;
  direccionSnapshot?: string;
  items: ItemPedidoInput[];
}
export interface ItemPedidoDto extends ItemPedidoInput {
  id: string;
  pedidoId: string;
  comandaId: string | null;
  precioUnitarioArs: number;
  precioUnitarioUsd: string;
  subtotalArs: number;
}
export interface ComandaDto {
  id: string;
  pedidoId: string;
  origen: OrigenComanda;
  estado: EstadoComanda;
  notas: string | null;
  items: ItemPedidoDto[];
  createdAt: string;
}
export interface PedidoDto extends CrearPedidoDto {
  id: string;
  turnoId: string;
  mozoId: string | null;
  repartidorId: string | null;
  estadoAtencion: EstadoAtencion;
  estadoPago: EstadoPago;
  costoEnvioArs: number;
  items: ItemPedidoDto[];
  comandas: ComandaDto[];
  createdAt: string;
  confirmadoAt: string | null;
  listoAt: string | null;
  entregadoAt: string | null;
}
export interface CambiarEstadoAtencionDto { estado: EstadoAtencion; motivoCancelacion?: string }
export interface CambiarEstadoComandaDto { estado: EstadoComanda }
