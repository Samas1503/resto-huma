// Eventos Socket.io tipados (B4 gateway → C3 cocina / C4 bandeja)
import { ComandaDto, PedidoDto } from './contracts/pedidos.js';
import { EstadoAtencion, EstadoComanda } from './enums.js';

export const EVENTS = {
  comandaNueva: 'comanda.nueva',
  comandaEstado: 'comanda.estado',
  pedidoEstado: 'pedido.estado',
  pedidoVirtualNuevo: 'pedido.virtual.nuevo',
  pagoConfirmado: 'pago.confirmado',
} as const;

export interface ComandaNuevaEvent { comanda: ComandaDto }
export interface ComandaEstadoEvent { comandaId: string; estado: EstadoComanda }
export interface PedidoEstadoEvent { pedidoId: string; estado: EstadoAtencion }
export interface PedidoVirtualNuevoEvent { pedido: PedidoDto }
export interface PagoConfirmadoEvent { pedidoId: string; pagoId: string }
