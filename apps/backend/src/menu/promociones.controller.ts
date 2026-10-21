import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { Auth } from '../common/index.js';
import { PromocionesService } from './promociones.service.js';
import { CreatePromocionDto } from './dto/create-promocion.dto.js';
import { UpdatePromocionDto } from './dto/update-promocion.dto.js';
import { AddPromocionProductoDto } from './dto/add-promocion-producto.dto.js';

// Gestión de promociones — solo admin (MODELO.MD UC28)
@Auth('admin')
@Controller('menu/promociones')
export class PromocionesController {
  constructor(private promociones: PromocionesService) {}

  @Get()
  findAll() {
    return this.promociones.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.promociones.findOne(id);
  }

  @Post()
  create(@Body() dto: CreatePromocionDto) {
    return this.promociones.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePromocionDto) {
    return this.promociones.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.promociones.remove(id);
  }

  // ─── Composición de la promo (PromocionProducto) ──────────
  @Post(':id/productos')
  addProducto(@Param('id') id: string, @Body() dto: AddPromocionProductoDto) {
    return this.promociones.addProducto(id, dto);
  }

  @Delete(':id/productos/:promocionProductoId')
  removeProducto(
    @Param('id') id: string,
    @Param('promocionProductoId') promocionProductoId: string,
  ) {
    return this.promociones.removeProducto(id, promocionProductoId);
  }
}
