import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { RealtimeGateway } from '../realtime/realtime.gateway.js';
import { AnulacionesController } from './anulaciones.controller.js';
import { AnulacionesService } from './anulaciones.service.js';
import { CajaController } from './caja.controller.js';
import { CajaService } from './caja.service.js';
import { CobrosService } from './cobros.service.js';
import { EgresosController } from './egresos.controller.js';
import { EgresosService } from './egresos.service.js';
import { FinanzasPagosController } from './pagos.controller.js';
import { StockRepositionPrismaService } from './stock-reposition.service.js';
import { REALTIME_EMITTER, STOCK_SERVICE } from './tokens.js';
import type { RealtimeEmitter } from './tokens.js';

/**
 * Módulo finanzas/caja (MODELO.MD §5): Caja, Pago (mixto + propina), Egreso,
 * CierreCaja (conciliación) y Anulacion (admin, reponeStock vía STOCK_SERVICE).
 *
 * Wiring:
 * - REALTIME_EMITTER → adaptador sobre RealtimeGateway (B4): emite 'pago.confirmado' por WS.
 * - STOCK_SERVICE → StockRepositionPrismaService (MovimientoStock tipo `anulacion`
 *   + reposición de Insumo.stockActual). El contrato shared de insumos solo expone
 *   descontarPorPedido(); cuando B6 exponga un método de reposición, re-bindear.
 */
@Module({
  imports: [RealtimeModule],
  controllers: [CajaController, FinanzasPagosController, EgresosController, AnulacionesController],
  providers: [
    CajaService,
    CobrosService,
    EgresosService,
    AnulacionesService,
    { provide: STOCK_SERVICE, useClass: StockRepositionPrismaService },
    {
      provide: REALTIME_EMITTER,
      inject: [RealtimeGateway],
      useFactory: (gateway: RealtimeGateway): RealtimeEmitter => ({
        emit: (evento, payload) => gateway.server?.emit(evento, payload),
      }),
    },
  ],
  exports: [CajaService, CobrosService, STOCK_SERVICE],
})
export class FinanzasModule {}
