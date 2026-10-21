import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

// Ítem de composición de una promoción (PromocionProducto)
export class AddPromocionProductoDto {
  @IsString()
  @IsNotEmpty()
  productoId!: string;

  // null/ausente = la promo aplica a todas las variedades del producto
  @IsOptional()
  @IsString()
  variedadId?: string;
}
