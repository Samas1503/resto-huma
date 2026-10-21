import { BadRequestException, Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { Pedido, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CajaService } from './caja.service.js';
import { CrearPagoDto } from './dto/crear-pago.dto.js';
import { PAGO_CONFIRMADO_EVENT, REALTIME_EMITTER } from './tokens.js';
import type { RealtimeEmitter } from './tokens.js';

type PedidoParaTotal = Pedido & {
  items: { id: string; subtotalArs: number }[];
  descuentos: { tipo: string; valor: Prisma.Decimal; itemPedidoId: string | null }[];
};

export interface RegistrarPagoInput extends CrearPagoDto {
  referenciaExterna?: string;
}

@Injectable()
export class CobrosService {
  constructor(
    private prisma: PrismaService,
    private caja: CajaService,
    @Optional() @Inject(REALTIME_EMITTER) private realtime?: RealtimeEmitter,
  ) {}

  /**
   * Registra un pago parcial (pago múltiple/mixto) contra el pedido en la caja abierta.
   * Cuando la suma de pagos vigentes cubre el total, marca pedido.estadoPago = cobrado
   * y emite el evento WS `pago.confirmado`.
   */
  async registrarPago(dto: RegistrarPagoInput, registradoPorId: string) {
    const pedido = await this.prisma.pedido.findUnique({ where: { id: dto.pedidoId } });
    if (!pedido) throw new NotFoundException('Pedido no encontrado');
    if (pedido.estadoPago === 'cobrado') throw new BadRequestException('El pedido ya está cobrado');
    if (pedido.estadoAtencion === 'cancelado') throw new BadRequestException('El pedido está cancelado');
    const caja = await this.caja.obtenerAbierta();

    const pago = await this.prisma.pago.create({
      data: {
        pedidoId: pedido.id,
        cajaId: caja.id,
        registradoPorId,
        montoArs: dto.montoArs,
        medioPago: dto.medioPago,
        propinaArs: dto.propinaArs ?? 0,
        referenciaExterna: dto.referenciaExterna ?? null,
      },
    });

    const estado = await this.reevaluarPagoPedido(pedido.id, pago.id);
    return { pago, ...estado };
  }

  /**
   * Recalcula pagos vigentes vs total del pedido y ajusta estadoPago.
   * - pagado >= total → cobrado + evento pago.confirmado
   * - pagado < total y estaba cobrado → vuelve a pendiente_de_cobro (anulaciones)
   * Propinas no cuentan para saldar la cuenta.
   */
  async reevaluarPagoPedido(pedidoId: string, ultimoPagoId?: string) {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: {
        items: true,
        descuentos: true,
        anulaciones: true,
        pagos: { where: { anulaciones: { none: {} } } },
      },
    });
    if (!pedido) throw new NotFoundException('Pedido no encontrado');

    const totalArs = this.totalPedido(pedido);
    const anulado = pedido.anulaciones.length > 0;
    const pagadoArs = anulado ? 0 : pedido.pagos.reduce((acc, p) => acc + p.montoArs, 0);

    let cobrado = pedido.estadoPago === 'cobrado';
    if (pagadoArs >= totalArs && !cobrado) {
      await this.prisma.pedido.update({ where: { id: pedidoId }, data: { estadoPago: 'cobrado' } });
      cobrado = true;
      this.realtime?.emit(PAGO_CONFIRMADO_EVENT, { pedidoId, pagoId: ultimoPagoId ?? null });
    } else if (pagadoArs < totalArs && cobrado) {
      await this.prisma.pedido.update({
        where: { id: pedidoId },
        data: { estadoPago: 'pendiente_de_cobro' },
      });
      cobrado = false;
    }
    return { cobrado, totalArs, pagadoArs, restanteArs: Math.max(0, totalArs - pagadoArs) };
  }

  /** Total del pedido en ARS entero: ítems + envío − descuentos aplicados (monto fijo o %). */
  private totalPedido(pedido: PedidoParaTotal): number {
    const itemsTotal = pedido.items.reduce((acc, i) => acc + i.subtotalArs, 0);
    let descuentos = 0;
    for (const d of pedido.descuentos) {
      const valor = Number(d.valor);
      if (d.tipo === 'monto') {
        descuentos += Math.round(valor);
      } else {
        const base = d.itemPedidoId
          ? (pedido.items.find((i) => i.id === d.itemPedidoId)?.subtotalArs ?? 0)
          : itemsTotal;
        descuentos += Math.round((base * valor) / 100);
      }
    }
    return Math.max(0, itemsTotal - descuentos + pedido.costoEnvioArs);
  }

  /** Pagos de un pedido; sin pedidoId, los de la caja abierta (o [] si no hay). */
  async listar(pedidoId?: string) {
    let cajaId: string | undefined;
    if (!pedidoId) {
      const caja = await this.prisma.caja.findFirst({ where: { estado: 'abierta' } });
      if (!caja) return [];
      cajaId = caja.id;
    }
    return this.prisma.pago.findMany({
      where: pedidoId ? { pedidoId } : { cajaId },
      orderBy: { createdAt: 'asc' },
      include: {
        registradoPor: { select: { id: true, nombre: true } },
        anulaciones: { select: { id: true, motivo: true, createdAt: true } },
      },
    });
  }
}
