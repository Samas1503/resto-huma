import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CobrosService } from './cobros.service.js';
import { CrearAnulacionDto } from './dto/crear-anulacion.dto.js';
import { STOCK_SERVICE } from './tokens.js';
import type { StockRepositionService } from './tokens.js';

@Injectable()
export class AnulacionesService {
  constructor(
    private prisma: PrismaService,
    private cobros: CobrosService,
    @Inject(STOCK_SERVICE) private stock: StockRepositionService,
  ) {}

  /**
   * Anulación de una venta cobrada (solo admin — S10 del modelo).
   * - pagoId: anula ese pago puntual.
   * - pedidoId: anula la venta completa (todos sus pagos quedan excluidos de totales).
   * reponeStock → movimientos de stock tipo `anulacion` vía STOCK_SERVICE.
   */
  async crear(dto: CrearAnulacionDto, autorizadoPorId: string) {
    if (!dto.pagoId && !dto.pedidoId) {
      throw new BadRequestException('Indicá pagoId o pedidoId a anular');
    }

    let pedidoId = dto.pedidoId;
    if (dto.pagoId) {
      const pago = await this.prisma.pago.findUnique({
        where: { id: dto.pagoId },
        include: { anulaciones: true },
      });
      if (!pago) throw new NotFoundException('Pago no encontrado');
      if (pago.anulaciones.length > 0) throw new BadRequestException('El pago ya está anulado');
      pedidoId = pago.pedidoId;
    } else {
      const pedido = await this.prisma.pedido.findUnique({ where: { id: pedidoId! } });
      if (!pedido) throw new NotFoundException('Pedido no encontrado');
    }

    const anulacion = await this.prisma.anulacion.create({
      data: {
        pagoId: dto.pagoId ?? null,
        pedidoId: pedidoId!,
        usuarioId: autorizadoPorId,
        motivo: dto.motivo,
        reponeStock: dto.reponeStock ?? true,
      },
    });

    if (anulacion.reponeStock) {
      await this.stock.reponerPorPedido(pedidoId!, autorizadoPorId, dto.motivo);
    }
    // Si los pagos vigentes ya no cubren el total, el pedido vuelve a pendiente_de_cobro.
    const estado = await this.cobros.reevaluarPagoPedido(pedidoId!);
    return { anulacion, ...estado };
  }

  listar() {
    return this.prisma.anulacion.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { usuario: { select: { id: true, nombre: true } } },
    });
  }
}
