import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Canal, Presentacion, Subtipo } from '@prisma/client';
import type {
  CrearPedidoDto as CrearPedidoContract,
  ItemPedidoInput,
} from '@resto-huma/shared';

export class ItemPedidoInputDto implements ItemPedidoInput {
  @IsString()
  @IsNotEmpty()
  productoId: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  variedadId?: string;

  @IsInt()
  @Min(1)
  cantidad: number;

  @IsOptional()
  @IsEnum(Presentacion)
  presentacion?: Presentacion;

  @IsOptional()
  @IsString()
  notas?: string;
}

export class CrearPedidoDto implements CrearPedidoContract {
  @IsEnum(Canal)
  canal: Canal;

  @IsEnum(Subtipo)
  subtipo: Subtipo;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  mesaId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  clienteId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  reservaId?: string;

  @IsOptional()
  @IsString()
  direccionSnapshot?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItemPedidoInputDto)
  items: ItemPedidoInputDto[];
}
