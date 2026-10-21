import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type Comanda, type ItemPedido, type Pedido, type Presentacion, type TipoMovimientoStock } from '@prisma/client';
import type { StockService } from '@resto-huma/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { CrearMovimientoStockBodyDto } from './dto/movimiento-stock.dto.js';

// Unidades de producto que representa cada presentación (GLOSARIO: unidad/docena/media docena)
const FACTOR_PRESENTACION: Record<Presentacion, number> = {
  unidad: 1,
  media_docena: 6,
  docena: 12,
};

type PedidoConItems = Pedido & { items: ItemPedido[]; comandas: Comanda[] };

@Injectable()
export class InsumosStockService implements StockService {
  constructor(private prisma: PrismaService) {}

  // Interfaz cross-módulo (B4 pedidos): se invoca al confirmar el pedido.
  // Lee ítems + receta mixta (base + ajuste por variedad), crea un MovimientoStock
  // negativo por insumo y descuenta stockActual, todo en una transacción.
  async descontarPorPedido(pedidoId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const pedido = await tx.pedido.findUnique({
        where: { id: pedidoId },
        include: { items: true, comandas: true },
      });
      if (!pedido) throw new NotFoundException('Pedido no encontrado');

      const consumos = await this.calcularConsumos(tx, pedido);
      if (consumos.size === 0) return;

      // Delta-aware: adiciones vuelven a invocar este método sobre el mismo
      // pedido. Restar lo ya descontado (movimientos descuento_pedido previos)
      // para no descontar los ítems originales dos veces.
      const previos = await tx.movimientoStock.groupBy({
        by: ['insumoId'],
        where: { pedidoId, tipo: 'descuento_pedido' },
        _sum: { cantidad: true },
      });
      for (const prev of previos) {
        const yaDescontado = new Prisma.Decimal(prev._sum.cantidad ?? 0).neg();
        const actual = consumos.get(prev.insumoId);
        if (actual) {
          const delta = actual.minus(yaDescontado);
          if (delta.lte(0)) consumos.delete(prev.insumoId);
          else consumos.set(prev.insumoId, delta);
        }
      }
      if (consumos.size === 0) return;

      // MovimientoStock.usuarioId es NOT NULL en el schema (el DER lo prevé
      // nullable para movimientos automáticos — drift reportado al parent).
      // Actor: mozo que tomó el pedido → quien confirmó la comanda → primer admin activo.
      const usuarioId = await this.resolverActor(tx, pedido);

      for (const [insumoId, cantidad] of consumos) {
        await tx.movimientoStock.create({
          data: {
            insumoId,
            pedidoId,
            usuarioId,
            tipo: 'descuento_pedido',
            cantidad: cantidad.neg(),
            motivo: `Descuento por pedido ${pedidoId}`,
          },
        });
        await tx.insumo.update({
          where: { id: insumoId },
          data: { stockActual: { decrement: cantidad } },
        });
      }
    });
  }

  // Repone el stock descontado por un pedido cancelado/anulado: invierte cada
  // MovimientoStock descuento_pedido previo con uno positivo reposicion_cancelacion.
  async reponerPorPedido(pedidoId: string, usuarioId?: string, motivo?: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const previos = await tx.movimientoStock.findMany({
        where: { pedidoId, tipo: 'descuento_pedido' },
      });
      for (const prev of previos) {
        const cantidad = new Prisma.Decimal(prev.cantidad).neg(); // original era negativo → repone positivo
        if (cantidad.lte(0)) continue;
        await tx.movimientoStock.create({
          data: {
            insumoId: prev.insumoId,
            pedidoId,
            usuarioId: usuarioId ?? null,
            tipo: 'reposicion_cancelacion',
            cantidad,
            motivo: motivo ?? `Reposición por cancelación del pedido ${pedidoId}`,
          },
        });
        await tx.insumo.update({
          where: { id: prev.insumoId },
          data: { stockActual: { increment: cantidad } },
        });
      }
    });
  }

  // Movimiento manual (compra / ajuste_manual). Reutilizable internamente pasando
  // pedidoId/tipo de sistema (p. ej. reposicion_cancelacion o anulacion desde finanzas).
  async registrarMovimiento(
    dto: CrearMovimientoStockBodyDto,
    usuarioId: string,
    extra?: { pedidoId?: string; tipo?: TipoMovimientoStock },
  ) {
    const tipo = extra?.tipo ?? dto.tipo;
    if (tipo === 'compra' && dto.cantidad <= 0) {
      throw new BadRequestException('Una compra debe registrar cantidad positiva');
    }
    return this.prisma.$transaction(async (tx) => {
      const insumo = await tx.insumo.findUnique({ where: { id: dto.insumoId } });
      if (!insumo) throw new NotFoundException('Insumo no encontrado');
      const movimiento = await tx.movimientoStock.create({
        data: {
          insumoId: dto.insumoId,
          usuarioId,
          pedidoId: extra?.pedidoId ?? null,
          tipo,
          cantidad: dto.cantidad,
          motivo: dto.motivo,
        },
      });
      await tx.insumo.update({
        where: { id: dto.insumoId },
        data: { stockActual: { increment: dto.cantidad } },
      });
      return movimiento;
    });
  }

  findMovimientos(insumoId?: string) {
    return this.prisma.movimientoStock.findMany({
      where: insumoId ? { insumoId } : {},
      include: { insumo: true, usuario: { select: { id: true, nombre: true, rol: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  // Agrega consumo por insumo: unidades del ítem (cantidad × presentación)
  // × cantidad de cada RecetaItem aplicable (base + ajuste de su variedad).
  private async calcularConsumos(
    tx: Prisma.TransactionClient,
    pedido: PedidoConItems,
  ): Promise<Map<string, Prisma.Decimal>> {
    const productoIds = [...new Set(pedido.items.map((i) => i.productoId))];
    const variedadIds = [...new Set(pedido.items.map((i) => i.variedadId).filter((v): v is string => !!v))];
    if (productoIds.length === 0) return new Map();

    const recetas = await tx.recetaItem.findMany({
      where: {
        productoId: { in: productoIds },
        OR: [{ variedadId: null }, { variedadId: { in: variedadIds } }],
      },
    });

    const consumos = new Map<string, Prisma.Decimal>();
    for (const item of pedido.items) {
      const unidades = item.cantidad * FACTOR_PRESENTACION[item.presentacion];
      const aplicables = recetas.filter(
        (r) => r.productoId === item.productoId && (r.variedadId === null || r.variedadId === item.variedadId),
      );
      for (const r of aplicables) {
        const total = new Prisma.Decimal(r.cantidad).mul(unidades);
        consumos.set(r.insumoId, (consumos.get(r.insumoId) ?? new Prisma.Decimal(0)).add(total));
      }
    }
    return consumos;
  }

  private async resolverActor(tx: Prisma.TransactionClient, pedido: PedidoConItems): Promise<string> {
    if (pedido.mozoId) return pedido.mozoId;
    const confirmada = pedido.comandas.find((c) => c.confirmadaPorId);
    if (confirmada?.confirmadaPorId) return confirmada.confirmadaPorId;
    const admin = await tx.usuario.findFirst({ where: { rol: 'admin', activo: true } });
    if (!admin) {
      throw new BadRequestException('No hay un usuario para registrar el movimiento automático de stock');
    }
    return admin.id;
  }
}
