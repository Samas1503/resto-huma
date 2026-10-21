import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { Auth } from '../common/index.js';
import { ComandasService } from './comandas.service.js';
import { CambiarEstadoComandaDto } from './dto/cambiar-estado.dto.js';
import { ListarComandasQueryDto } from './dto/query.dto.js';
import type { ComandaDto } from './pedidos.types.js';

@Controller('comandas')
export class ComandasController {
  constructor(private readonly comandas: ComandasService) {}

  // Bandeja de cocina (filtrar ?estado=pendiente / en_preparacion).
  @Get()
  @Auth('cocina', 'mozo', 'cajero', 'admin')
  listar(@Query() query: ListarComandasQueryDto): Promise<ComandaDto[]> {
    return this.comandas.listar(query);
  }

  @Patch(':id/estado')
  @Auth('cocina', 'admin')
  cambiarEstado(
    @Param('id') id: string,
    @Body() dto: CambiarEstadoComandaDto,
  ): Promise<ComandaDto> {
    return this.comandas.cambiarEstado(id, dto);
  }
}
