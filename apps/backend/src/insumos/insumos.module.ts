import { Module } from '@nestjs/common';
import { InsumosController } from './insumos.controller.js';
import { InsumosService } from './insumos.service.js';
import { MovimientosController } from './movimientos.controller.js';
import { RecetasController } from './recetas.controller.js';
import { RecetasService } from './recetas.service.js';
import { InsumosStockService } from './stock.service.js';

// 'StockService' (token string) permite a pedidos (B4) inyectar la interfaz
// cross-módulo @resto-huma/shared sin acoplarse a la clase concreta.
export const STOCK_SERVICE = 'StockService';

@Module({
  controllers: [InsumosController, RecetasController, MovimientosController],
  providers: [
    InsumosService,
    RecetasService,
    InsumosStockService,
    { provide: STOCK_SERVICE, useExisting: InsumosStockService },
  ],
  exports: [InsumosStockService, STOCK_SERVICE],
})
export class InsumosModule {}
