import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ItemPedidoInputDto } from './crear-pedido.dto.js';

// Adición sobre un pedido abierto: genera una NUEVA comanda con estos ítems.
export class AgregarItemsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItemPedidoInputDto)
  items: ItemPedidoInputDto[];

  @IsOptional()
  @IsString()
  notas?: string; // nota de la comanda generada (ej: "segunda vuelta")
}
