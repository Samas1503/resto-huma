import { Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway.js';

// Puerto genérico esperado por finanzas (B5): @Inject(REALTIME_EMITTER) con
// interfaz { emit(evento, payload) }. Exportarlo acá permite al parent inyectar
// el gateway en otros módulos sin acoplarlos a la clase concreta.
export const REALTIME_EMITTER = 'REALTIME_EMITTER';

@Module({
  providers: [
    RealtimeGateway,
    { provide: REALTIME_EMITTER, useExisting: RealtimeGateway },
  ],
  exports: [RealtimeGateway, REALTIME_EMITTER],
})
export class RealtimeModule {}
