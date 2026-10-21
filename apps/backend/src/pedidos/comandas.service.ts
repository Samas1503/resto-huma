import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { EstadoComanda } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { RealtimeGateway } from '../realtime/realtime.gateway.js';
import type { CambiarEstadoComandaDto } from './dto/cambiar-estado.dto.js';
import type { ListarComandasQueryDto } from './dto/query.dto.js';
import { toComandaDto } from './pedidos.mapper.js';
import type { ComandaConItems, ComandaDto } from './pedidos.types.js';

// Ciclo de comanda en cocina (GLOSARIO.MD): pendiente → en_preparacion → lista | anulada.
const TRANSICIONES_COMANDA: Record<EstadoComanda, readonly EstadoComanda[]> = {
  pendiente: ['en_preparacion', 'lista', 'anulada'],
  en_preparacion: ['lista', 'anulada'],
  lista: [],
  anulada: [],
};

@Injectable()
export class ComandasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async listar(query: ListarComandasQueryDto): Promise<ComandaDto[]> {
    const comandas = await this.prisma.comanda.findMany({
      where: { estado: query.estado },
      include: { items: true },
      orderBy: { createdAt: 'asc' },
    });
    return comandas.map(toComandaDto);
  }

  async cambiarEstado(id: string, dto: CambiarEstadoComandaDto): Promise<ComandaDto> {
    const comanda = await this.getComandaOrThrow(id);
    const destino = dto.estado;
    if (!TRANSICIONES_COMANDA[comanda.estado].includes(destino)) {
      throw new ConflictException(
        `Transición de comanda inválida: ${comanda.estado} → ${destino}`,
      );
    }
    const actualizada = await this.prisma.comanda.update({
      where: { id },
      data: { estado: destino },
      include: { items: true },
    });
    this.realtime.emitComandaEstado(id, destino);
    await this.syncPedidoEstado(comanda.pedidoId);
    return toComandaDto(actualizada);
  }

  // El estado del pedido se deriva de sus comandas activas:
  // todas listas → pedido listo; alguna en preparación → pedido en_preparacion.
  private async syncPedidoEstado(pedidoId: string): Promise<void> {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: { comandas: true },
    });
    if (!pedido) return;
    if (pedido.estadoAtencion !== 'confirmado' && pedido.estadoAtencion !== 'en_preparacion') {
      return;
    }
    const activas = pedido.comandas.filter((c) => c.estado !== 'anulada');
    if (activas.length === 0) return;

    if (activas.every((c) => c.estado === 'lista')) {
      await this.prisma.pedido.update({
        where: { id: pedidoId },
        data: { estadoAtencion: 'listo', listoAt: new Date() },
      });
      this.realtime.emitPedidoEstado(pedidoId, 'listo');
    } else if (
      pedido.estadoAtencion === 'confirmado' &&
      activas.some((c) => c.estado === 'en_preparacion')
    ) {
      await this.prisma.pedido.update({
        where: { id: pedidoId },
        data: { estadoAtencion: 'en_preparacion' },
      });
      this.realtime.emitPedidoEstado(pedidoId, 'en_preparacion');
    }
  }

  private async getComandaOrThrow(id: string): Promise<ComandaConItems> {
    const comanda = await this.prisma.comanda.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!comanda) throw new NotFoundException(`Comanda no encontrada: ${id}`);
    return comanda;
  }
}
