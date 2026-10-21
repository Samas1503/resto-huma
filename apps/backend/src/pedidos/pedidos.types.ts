import type { Prisma } from '@prisma/client';
import type { PedidoDto, ComandaDto, ItemPedidoDto, TipoDescuento } from '@resto-huma/shared';

export type { ComandaDto, ItemPedidoDto, PedidoDto } from '@resto-huma/shared';

export type PedidoConDetalle = Prisma.PedidoGetPayload<{
  include: {
    items: true;
    comandas: { include: { items: true } };
    descuentos: true;
    cliente: { select: { id: true; nombre: true; telefono: true } };
  };
}>;
export type ComandaConItems = Prisma.ComandaGetPayload<{ include: { items: true } }>;

// Extras por encima del contrato congelado (forward-compatible con C9/UI)
export interface DescuentoDto {
  id: string;
  promocionId: string | null;
  tipo: TipoDescuento;
  valor: string;
  motivo: string | null;
}
export interface ClienteResumenDto { id: string; nombre: string; telefono: string | null }
export interface PedidoDetalleDto extends PedidoDto {
  descuentos?: DescuentoDto[];
  cliente?: ClienteResumenDto | null;
}
