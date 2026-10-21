import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  Canal,
  EstadoAtencion,
  Prisma,
  Subtipo,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { RealtimeGateway } from '../realtime/realtime.gateway.js';
import type { JwtUser } from '../common/index.js';
import type { StockService } from '@resto-huma/shared';
import { STOCK_SERVICE } from './stock.service.js';
import type { CrearPedidoDto, ItemPedidoInputDto } from './dto/crear-pedido.dto.js';
import type { AgregarItemsDto } from './dto/agregar-items.dto.js';
import type { CambiarEstadoAtencionDto } from './dto/cambiar-estado.dto.js';
import type { ListarPedidosQueryDto } from './dto/query.dto.js';
import { toComandaDto, toPedidoDto } from './pedidos.mapper.js';
import type { PedidoConDetalle, PedidoDto } from './pedidos.types.js';

const PEDIDO_INCLUDE = {
  items: true,
  comandas: { include: { items: true }, orderBy: { createdAt: 'asc' } },
  descuentos: true,
  cliente: { select: { id: true, nombre: true, telefono: true } },
} satisfies Prisma.PedidoInclude;

// Ciclo de atención (GLOSARIO.MD): delivery agrega en_reparto entre listo y entregado.
const TRANSICIONES: Record<EstadoAtencion, readonly EstadoAtencion[]> = {
  pendiente: ['confirmado', 'cancelado'],
  confirmado: ['en_preparacion', 'cancelado'],
  en_preparacion: ['listo', 'cancelado'],
  listo: ['en_reparto', 'entregado', 'cancelado'],
  en_reparto: ['entregado', 'cancelado'],
  entregado: [],
  cancelado: [],
};

const SUBTIPOS_POR_CANAL: Record<Canal, readonly Subtipo[]> = {
  presencial: ['mesa', 'mostrador'],
  virtual: ['takeaway', 'delivery'],
};

// Estados en los que el pedido aún admite adiciones (nueva comanda).
const ESTADOS_ADICIONABLES: readonly EstadoAtencion[] = [
  'confirmado',
  'en_preparacion',
  'listo',
];

@Injectable()
export class PedidosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
    @Inject(STOCK_SERVICE) private readonly stock: StockService,
  ) {}

  async crear(dto: CrearPedidoDto, user?: JwtUser): Promise<PedidoDto> {
    this.assertCanalSubtipo(dto);
    if (dto.subtipo === 'mesa') await this.assertMesa(dto.mesaId!);

    const turno = await this.prisma.turno.findFirst({
      where: { cierre: null },
      orderBy: { apertura: 'desc' },
    });
    if (!turno) {
      throw new ConflictException(
        'No hay un turno abierto para registrar el pedido',
      );
    }

    const direccionSnapshot = await this.resolveDireccion(dto);
    const items = await this.resolveItems(dto.items);
    const presencial = dto.canal === 'presencial';
    const now = new Date();

    // Presencial: el mozo confirma al enviar la comanda → el pedido nace
    // confirmado y con su primera comanda lista para cocina.
    const creado = await this.prisma.$transaction(async (tx) => {
      const pedido = await tx.pedido.create({
        data: {
          turnoId: turno.id,
          canal: dto.canal,
          subtipo: dto.subtipo,
          mesaId: dto.subtipo === 'mesa' ? dto.mesaId! : null,
          clienteId: dto.clienteId ?? null,
          reservaId: dto.reservaId ?? null,
          mozoId: presencial && user ? user.sub : null,
          direccionSnapshot,
          estadoAtencion: presencial ? 'confirmado' : 'pendiente',
          confirmadoAt: presencial ? now : null,
        },
      });
      let comandaId: string | null = null;
      if (presencial) {
        const comanda = await tx.comanda.create({
          data: { pedidoId: pedido.id, origen: 'mozo' },
        });
        comandaId = comanda.id;
      }
      await tx.itemPedido.createMany({
        data: items.map((item) => ({ ...item, pedidoId: pedido.id, comandaId })),
      });
      if (dto.subtipo === 'mesa' && dto.mesaId) {
        await tx.mesa.update({
          where: { id: dto.mesaId },
          data: { estado: 'ocupada' },
        });
      }
      return pedido;
    });

    const full = await this.getPedidoOrThrow(creado.id);
    if (presencial) {
      const comanda = full.comandas[full.comandas.length - 1];
      if (comanda) this.realtime.emitComandaNueva(toComandaDto(comanda));
      await this.stock.descontarPorPedido(creado.id);
      this.realtime.emitPedidoEstado(creado.id, 'confirmado');
    } else {
      this.realtime.emitPedidoVirtualNuevo(toPedidoDto(full));
    }
    return toPedidoDto(full);
  }

  async agregarItems(
    pedidoId: string,
    dto: AgregarItemsDto,
    _user: JwtUser,
  ): Promise<PedidoDto> {
    const pedido = await this.getPedidoOrThrow(pedidoId);
    if (!ESTADOS_ADICIONABLES.includes(pedido.estadoAtencion)) {
      throw new ConflictException(
        `No se pueden agregar ítems a un pedido en estado ${pedido.estadoAtencion}`,
      );
    }
    const items = await this.resolveItems(dto.items);

    // Cada adición genera una comanda NUEVA dentro del mismo pedido.
    const comanda = await this.prisma.$transaction(async (tx) => {
      const creada = await tx.comanda.create({
        data: {
          pedidoId,
          origen: pedido.canal === 'presencial' ? 'mozo' : 'sistema',
          notas: dto.notas ?? null,
        },
      });
      await tx.itemPedido.createMany({
        data: items.map((item) => ({
          ...item,
          pedidoId,
          comandaId: creada.id,
        })),
      });
      // Si el pedido ya estaba listo, vuelve a preparación por los ítems nuevos.
      if (pedido.estadoAtencion === 'listo') {
        await tx.pedido.update({
          where: { id: pedidoId },
          data: { estadoAtencion: 'en_preparacion', listoAt: null },
        });
      }
      return creada;
    });

    const full = await this.getPedidoOrThrow(pedidoId);
    const nueva = full.comandas.find((c) => c.id === comanda.id);
    if (nueva) this.realtime.emitComandaNueva(toComandaDto(nueva));
    if (pedido.estadoAtencion === 'listo') {
      this.realtime.emitPedidoEstado(pedidoId, 'en_preparacion');
    }
    // NOTA: la implementación real (B6/insumos) debe descontar solo el delta
    // de ítems sin movimiento previo, para no descontar dos veces los originales.
    await this.stock.descontarPorPedido(pedidoId);
    return toPedidoDto(full);
  }

  async cambiarEstado(
    pedidoId: string,
    dto: CambiarEstadoAtencionDto,
    user: JwtUser,
  ): Promise<PedidoDto> {
    const pedido = await this.getPedidoOrThrow(pedidoId);
    const destino = dto.estado;

    if (!TRANSICIONES[pedido.estadoAtencion].includes(destino)) {
      throw new ConflictException(
        `Transición inválida: ${pedido.estadoAtencion} → ${destino}`,
      );
    }
    if (destino === 'en_reparto' && pedido.subtipo !== 'delivery') {
      throw new BadRequestException(
        'en_reparto solo aplica a pedidos con subtipo delivery',
      );
    }
    if (
      destino === 'entregado' &&
      pedido.subtipo === 'delivery' &&
      pedido.estadoAtencion !== 'en_reparto'
    ) {
      throw new BadRequestException(
        'Un pedido delivery debe pasar por en_reparto antes de entregado',
      );
    }
    if (destino === 'cancelado' && !dto.motivoCancelacion) {
      throw new BadRequestException(
        'Cancelar un pedido requiere motivoCancelacion',
      );
    }

    const data: Prisma.PedidoUncheckedUpdateInput = { estadoAtencion: destino };
    if (destino === 'confirmado') data.confirmadoAt = new Date();
    if (destino === 'listo') data.listoAt = new Date();
    if (destino === 'entregado') data.entregadoAt = new Date();
    if (destino === 'cancelado') data.motivoCancelacion = dto.motivoCancelacion;
    if (destino === 'en_reparto' && user.rol === 'repartidor') {
      data.repartidorId = user.sub;
    }

    // Al confirmar un pedido virtual pendiente, el sistema genera la comanda
    // con todos los ítems aún no enviados a cocina y descuenta stock.
    let nuevaComandaId: string | null = null;
    if (destino === 'confirmado') {
      nuevaComandaId = await this.prisma.$transaction(async (tx) => {
        const sinComanda = await tx.itemPedido.findMany({
          where: { pedidoId, comandaId: null },
          select: { id: true },
        });
        let comandaId: string | null = null;
        if (sinComanda.length > 0) {
          const comanda = await tx.comanda.create({
            data: {
              pedidoId,
              origen: 'sistema',
              confirmadaPorId: user.sub,
            },
          });
          await tx.itemPedido.updateMany({
            where: { id: { in: sinComanda.map((i) => i.id) } },
            data: { comandaId: comanda.id },
          });
          comandaId = comanda.id;
        }
        await tx.pedido.update({ where: { id: pedidoId }, data });
        return comandaId;
      });
      await this.stock.descontarPorPedido(pedidoId);
    } else {
      // Cancelar un pedido anula sus comandas activas para que no queden
      // huérfanas en la bandeja de cocina (gap detectado por C3).
      let comandasAnuladas: { id: string }[] = [];
      if (destino === 'cancelado') {
        comandasAnuladas = await this.prisma.$transaction(async (tx) => {
          await tx.pedido.update({ where: { id: pedidoId }, data });
          const activas = await tx.comanda.findMany({
            where: { pedidoId, estado: { in: ['pendiente', 'en_preparacion'] } },
            select: { id: true },
          });
          if (activas.length > 0) {
            await tx.comanda.updateMany({
              where: { id: { in: activas.map((c) => c.id) } },
              data: { estado: 'anulada' },
            });
          }
          return activas;
        });
        // Reposición de stock: el pedido se descontó al confirmar.
        await this.stock.reponerPorPedido?.(pedidoId, user?.sub, dto.motivoCancelacion);
      } else {
        await this.prisma.pedido.update({ where: { id: pedidoId }, data });
      }
      const full = await this.getPedidoOrThrow(pedidoId);
      for (const c of comandasAnuladas) {
        this.realtime.emitComandaEstado(c.id, 'anulada');
      }
      this.realtime.emitPedidoEstado(pedidoId, destino);
      return toPedidoDto(full);
    }

    const full = await this.getPedidoOrThrow(pedidoId);
    if (nuevaComandaId) {
      const comanda = full.comandas.find((c) => c.id === nuevaComandaId);
      if (comanda) this.realtime.emitComandaNueva(toComandaDto(comanda));
    }
    this.realtime.emitPedidoEstado(pedidoId, destino);
    return toPedidoDto(full);
  }

  // Punto de entrada para finanzas (B5): marca el pedido como cobrado.
  // El cobro en sí (Pago, caja, pasarela) lo maneja el módulo finanzas.
  async marcarPagado(pedidoId: string): Promise<PedidoDto> {
    const pedido = await this.getPedidoOrThrow(pedidoId);
    if (pedido.estadoPago === 'cobrado') {
      throw new ConflictException('El pedido ya está cobrado');
    }
    await this.prisma.pedido.update({
      where: { id: pedidoId },
      data: { estadoPago: 'cobrado' },
    });
    return toPedidoDto(await this.getPedidoOrThrow(pedidoId));
  }

  // Bandeja de confirmación: pedidos virtuales esperando aceptación del local.
  async bandejaVirtual(): Promise<PedidoDto[]> {
    const pedidos = await this.prisma.pedido.findMany({
      where: { canal: 'virtual', estadoAtencion: 'pendiente' },
      include: PEDIDO_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
    return pedidos.map(toPedidoDto);
  }

  async listar(query: ListarPedidosQueryDto): Promise<PedidoDto[]> {
    const pedidos = await this.prisma.pedido.findMany({
      where: {
        canal: query.canal,
        subtipo: query.subtipo,
        estadoAtencion: query.estadoAtencion,
        estadoPago: query.estadoPago,
        mesaId: query.mesaId,
        clienteId: query.clienteId,
      },
      include: PEDIDO_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return pedidos.map(toPedidoDto);
  }

  async findOne(id: string): Promise<PedidoDto> {
    return toPedidoDto(await this.getPedidoOrThrow(id));
  }

  private async getPedidoOrThrow(id: string): Promise<PedidoConDetalle> {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id },
      include: PEDIDO_INCLUDE,
    });
    if (!pedido) throw new NotFoundException(`Pedido no encontrado: ${id}`);
    return pedido;
  }

  private assertCanalSubtipo(dto: CrearPedidoDto): void {
    if (!SUBTIPOS_POR_CANAL[dto.canal].includes(dto.subtipo)) {
      throw new BadRequestException(
        `Subtipo ${dto.subtipo} no válido para el canal ${dto.canal}`,
      );
    }
    if (dto.subtipo === 'mesa' && !dto.mesaId) {
      throw new BadRequestException('El pedido de mesa requiere mesaId');
    }
    if (dto.subtipo === 'mostrador' && dto.mesaId) {
      throw new BadRequestException(
        'El pedido de mostrador no lleva mesa asociada',
      );
    }
  }

  private async assertMesa(mesaId: string): Promise<void> {
    const mesa = await this.prisma.mesa.findUnique({ where: { id: mesaId } });
    if (!mesa) throw new NotFoundException(`Mesa no encontrada: ${mesaId}`);
  }

  // Delivery exige snapshot de dirección: usa la del body o la principal del cliente.
  private async resolveDireccion(dto: CrearPedidoDto): Promise<string | null> {
    if (dto.subtipo !== 'delivery') return null;
    if (dto.direccionSnapshot) return dto.direccionSnapshot;
    if (dto.clienteId) {
      const dir =
        (await this.prisma.direccion.findFirst({
          where: { clienteId: dto.clienteId, esPrincipal: true },
        })) ??
        (await this.prisma.direccion.findFirst({
          where: { clienteId: dto.clienteId },
        }));
      if (dir) {
        return [dir.calle, dir.ciudad, dir.referencia]
          .filter(Boolean)
          .join(', ');
      }
    }
    throw new BadRequestException(
      'El pedido delivery requiere dirección de entrega',
    );
  }

  // Snapshot de precios: override de Variedad o precio base del Producto.
  private async resolveItems(inputs: ItemPedidoInputDto[]) {
    return Promise.all(
      inputs.map(async (input) => {
        const producto = await this.prisma.producto.findUnique({
          where: { id: input.productoId },
        });
        if (!producto || !producto.activo || !producto.disponible) {
          throw new BadRequestException(
            `Producto no disponible: ${input.productoId}`,
          );
        }
        let variedad = null;
        if (input.variedadId) {
          variedad = await this.prisma.variedad.findUnique({
            where: { id: input.variedadId },
          });
          if (
            !variedad ||
            variedad.productoId !== producto.id ||
            !variedad.disponible
          ) {
            throw new BadRequestException(
              `Variedad no disponible: ${input.variedadId}`,
            );
          }
        }
        const precioArs = variedad?.precioArs ?? producto.precioArs;
        const precioUsd = variedad?.precioUsd ?? producto.precioUsd;
        return {
          productoId: producto.id,
          variedadId: variedad?.id ?? null,
          cantidad: input.cantidad,
          presentacion: input.presentacion ?? ('unidad' as const),
          notas: input.notas ?? null,
          precioUnitarioArs: precioArs,
          precioUnitarioUsd: precioUsd,
          subtotalArs: precioArs * input.cantidad,
        };
      }),
    );
  }
}
