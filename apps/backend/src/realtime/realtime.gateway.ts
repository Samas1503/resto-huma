import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import type { EstadoAtencion, EstadoComanda } from '@prisma/client';
import {
  EVENTS,
  type ComandaDto,
  type ComandaEstadoEvent,
  type ComandaNuevaEvent,
  type PedidoDto,
  type PedidoEstadoEvent,
  type PedidoVirtualNuevoEvent,
} from '@resto-huma/shared';

// Gateway Socket.io del sistema. CORS abierto para desarrollo local;
// ajustar a los orígenes reales cuando se defina configuración por entorno.
@WebSocketGateway({ cors: { origin: '*' } })
export class RealtimeGateway {
  @WebSocketServer()
  server: Server;

  // Emisor genérico (puerto REALTIME_EMITTER consumido por finanzas/B5).
  emit(evento: string, payload: unknown): void {
    this.server.emit(evento, payload);
  }

  emitComandaNueva(comanda: ComandaDto): void {
    const payload: ComandaNuevaEvent = { comanda };
    this.server.emit(EVENTS.comandaNueva, payload);
  }

  emitComandaEstado(comandaId: string, estado: EstadoComanda): void {
    const payload: ComandaEstadoEvent = { comandaId, estado };
    this.server.emit(EVENTS.comandaEstado, payload);
  }

  emitPedidoEstado(pedidoId: string, estado: EstadoAtencion): void {
    const payload: PedidoEstadoEvent = { pedidoId, estado };
    this.server.emit(EVENTS.pedidoEstado, payload);
  }

  emitPedidoVirtualNuevo(pedido: PedidoDto): void {
    const payload: PedidoVirtualNuevoEvent = { pedido };
    this.server.emit(EVENTS.pedidoVirtualNuevo, payload);
  }
}
