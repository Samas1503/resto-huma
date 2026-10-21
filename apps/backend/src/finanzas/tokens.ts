// Tokens de inyección para integraciones cross-módulo (spec 001: B4 realtime / B6 insumos).
// Esos módulos se desarrollan en paralelo; el parent re-bindea estos providers
// cuando existan (ver finanzas.module.ts y reportes de tarea).

// Gateway Socket.io de B4: emitir eventos WS tipados (events.ts de shared).
export const REALTIME_EMITTER = 'REALTIME_EMITTER';
export interface RealtimeEmitter {
  emit(evento: string, payload: unknown): void;
}

// Servicio de stock de B6. El contrato shared (contracts/insumos.ts) solo declara
// descontarPorPedido(); para la reposición por anulación se define este puerto local
// con implementación Prisma por defecto hasta que insumos exponga su servicio.
export const STOCK_SERVICE = 'STOCK_SERVICE';
export interface StockRepositionService {
  reponerPorPedido(pedidoId: string, usuarioId: string, motivo: string): Promise<void>;
}

// Nombre del evento WS (espejo de EVENTS.pagoConfirmado de shared/events.ts).
// Literal local para no depender del runtime del paquete shared (exporta .ts crudo).
export const PAGO_CONFIRMADO_EVENT = 'pago.confirmado';
