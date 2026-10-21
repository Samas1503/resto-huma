import { TipoMovimientoStock } from '../enums.js';

export interface CrearInsumoDto {
  nombre: string;
  unidadMedida: string;
  stockMinimo: number;
  costoUnitario: number;
}
export interface InsumoDto extends CrearInsumoDto {
  id: string;
  stockActual: number;
}
export interface RecetaItemDto {
  productoId: string;
  variedadId?: string; // null = base; set = ajuste por variedad (receta mixta)
  insumoId: string;
  cantidad: number;
}
export interface MovimientoStockDto {
  insumoId: string;
  tipo: TipoMovimientoStock;
  cantidad: number;
  motivo?: string;
}
// Interfaz cross-módulo consumida por pedidos (descuento al confirmar,
// reposición al cancelar/anular)
export interface StockService {
  descontarPorPedido(pedidoId: string): Promise<void>;
  reponerPorPedido?(pedidoId: string, usuarioId?: string, motivo?: string): Promise<void>;
}
