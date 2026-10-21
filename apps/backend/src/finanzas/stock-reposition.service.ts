import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { StockRepositionService } from './tokens.js';

/**
 * Implementación por defecto de STOCK_SERVICE (token en finanzas/tokens.ts).
 * Escribe MovimientoStock tipo `anulacion` (cantidad positiva) revirtiendo los
 * `descuento_pedido` del pedido y repone Insumo.stockActual, en una transacción.
 * Cuando el módulo insumos (B6) exista, el parent puede re-bindear STOCK_SERVICE
 * a su StockService para centralizar la lógica de stock.
 */
@Injectable()
export class StockRepositionPrismaService implements StockRepositionService {
  constructor(private prisma: PrismaService) {}

  async reponerPorPedido(pedidoId: string, usuarioId: string, motivo: string) {
    const yaRepuesto = await this.prisma.movimientoStock.findFirst({
      where: { pedidoId, tipo: 'anulacion' },
    });
    if (yaRepuesto) return; // idempotente: el pedido ya fue repuesto

    const descuentos = await this.prisma.movimientoStock.findMany({
      where: { pedidoId, tipo: 'descuento_pedido' },
    });
    if (!descuentos.length) return;

    await this.prisma.$transaction(
      descuentos.flatMap((m) => {
        const cantidad = m.cantidad.abs(); // restaura la salida (descuentos son negativos)
        return [
          this.prisma.movimientoStock.create({
            data: {
              insumoId: m.insumoId,
              pedidoId,
              usuarioId,
              tipo: 'anulacion',
              cantidad,
              motivo,
            },
          }),
          this.prisma.insumo.update({
            where: { id: m.insumoId },
            data: { stockActual: { increment: cantidad } },
          }),
        ];
      }),
    );
  }
}
