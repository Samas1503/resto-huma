import { Injectable, Logger } from '@nestjs/common';
import type { StockService } from '@resto-huma/shared';

// Token de inyección cross-módulo (mismo string que exporta InsumosModule de B6,
// para que el wiring Pedidos→Insumos del parent sea trivial). Hasta que el parent
// re-bindee al servicio real, se usa NoopStockService como fallback.
export const STOCK_SERVICE = 'StockService';

@Injectable()
export class NoopStockService implements StockService {
  private readonly logger = new Logger(NoopStockService.name);

  async descontarPorPedido(pedidoId: string): Promise<void> {
    this.logger.warn(
      `StockService no provisto (wiring con insumos pendiente): descuento de stock omitido para pedido ${pedidoId}`,
    );
  }
}
