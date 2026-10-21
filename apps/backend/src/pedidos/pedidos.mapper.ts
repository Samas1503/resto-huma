import type { ItemPedido } from '@prisma/client';
import type {
  ComandaConItems,
  ComandaDto,
  ItemPedidoDto,
  PedidoConDetalle,
  PedidoDto,
} from './pedidos.types.js';

export function toItemDto(item: ItemPedido): ItemPedidoDto {
  return {
    id: item.id,
    pedidoId: item.pedidoId,
    comandaId: item.comandaId,
    productoId: item.productoId,
    variedadId: item.variedadId ?? undefined,
    cantidad: item.cantidad,
    presentacion: item.presentacion,
    notas: item.notas ?? undefined,
    precioUnitarioArs: item.precioUnitarioArs,
    precioUnitarioUsd: item.precioUnitarioUsd.toString(),
    subtotalArs: item.subtotalArs,
  };
}

export function toComandaDto(comanda: ComandaConItems): ComandaDto {
  return {
    id: comanda.id,
    pedidoId: comanda.pedidoId,
    origen: comanda.origen,
    estado: comanda.estado,
    notas: comanda.notas,
    items: comanda.items.map(toItemDto),
    createdAt: comanda.createdAt.toISOString(),
  };
}

export function toPedidoDto(pedido: PedidoConDetalle): PedidoDto {
  return {
    id: pedido.id,
    canal: pedido.canal,
    subtipo: pedido.subtipo,
    mesaId: pedido.mesaId ?? undefined,
    clienteId: pedido.clienteId ?? undefined,
    reservaId: pedido.reservaId ?? undefined,
    direccionSnapshot: pedido.direccionSnapshot ?? undefined,
    turnoId: pedido.turnoId,
    mozoId: pedido.mozoId,
    repartidorId: pedido.repartidorId,
    estadoAtencion: pedido.estadoAtencion,
    estadoPago: pedido.estadoPago,
    costoEnvioArs: pedido.costoEnvioArs,
    items: pedido.items.map(toItemDto),
    comandas: pedido.comandas.map(toComandaDto),
    ...(('descuentos' in pedido) && pedido.descuentos ? { descuentos: pedido.descuentos.map((d: { id: string; promocionId: string | null; tipo: string; valor: unknown; motivo: string | null }) => ({ id: d.id, promocionId: d.promocionId, tipo: d.tipo, valor: String(d.valor), motivo: d.motivo })) } : {}),
    ...(('cliente' in pedido) ? { cliente: pedido.cliente ?? null } : {}),
    createdAt: pedido.createdAt.toISOString(),
    confirmadoAt: pedido.confirmadoAt?.toISOString() ?? null,
    listoAt: pedido.listoAt?.toISOString() ?? null,
    entregadoAt: pedido.entregadoAt?.toISOString() ?? null,
  };
}
