import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { InsumosModule } from '../insumos/insumos.module.js';
import { InsumosStockService } from '../insumos/stock.service.js';
import { ComandasController } from './comandas.controller.js';
import { ComandasService } from './comandas.service.js';
import { PedidosController } from './pedidos.controller.js';
import { PedidosPublicoController } from './pedidos-publico.controller.js';
import { PedidosService } from './pedidos.service.js';
import { STOCK_SERVICE } from './stock.service.js';

@Module({
  imports: [RealtimeModule, InsumosModule],
  controllers: [PedidosController, PedidosPublicoController, ComandasController],
  providers: [
    PedidosService,
    ComandasService,
    { provide: STOCK_SERVICE, useExisting: InsumosStockService },
  ],
  exports: [PedidosService, ComandasService],
})
export class PedidosModule {}
