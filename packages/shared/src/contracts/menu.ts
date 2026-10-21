import { CategoriaProducto, TipoPromocion } from '../enums.js';

export interface CrearProductoDto {
  nombre: string;
  categoria: CategoriaProducto;
  precioArs: number;
  precioUsd: number;
}
export interface CrearVariedadDto {
  nombre: string;
  precioArs?: number;
  precioUsd?: number;
}
export interface ProductoDto extends CrearProductoDto {
  id: string;
  disponible: boolean;
  activo: boolean;
  variedades: VariedadDto[];
}
export interface VariedadDto extends CrearVariedadDto {
  id: string;
  productoId: string;
  disponible: boolean;
}
export interface CrearPromocionDto {
  nombre: string;
  tipo: TipoPromocion;
  valor: number;
  fechaInicio?: string;
  fechaFin?: string;
}
