import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { Auth } from '../common/index.js';
import { ProductosService } from './productos.service.js';
import { CreateProductoDto } from './dto/create-producto.dto.js';
import { UpdateProductoDto } from './dto/update-producto.dto.js';
import { CreateVariedadDto } from './dto/create-variedad.dto.js';
import { UpdateVariedadDto } from './dto/update-variedad.dto.js';

// Gestión del menú — solo admin (MODELO.MD UC25)
@Auth('admin')
@Controller('menu/productos')
export class ProductosController {
  constructor(private productos: ProductosService) {}

  @Get()
  findAll() {
    return this.productos.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productos.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateProductoDto) {
    return this.productos.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductoDto) {
    return this.productos.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productos.remove(id);
  }

  // ─── Variedades anidadas ──────────────────────────────────
  @Post(':productoId/variedades')
  createVariedad(@Param('productoId') productoId: string, @Body() dto: CreateVariedadDto) {
    return this.productos.createVariedad(productoId, dto);
  }

  @Patch(':productoId/variedades/:variedadId')
  updateVariedad(
    @Param('productoId') productoId: string,
    @Param('variedadId') variedadId: string,
    @Body() dto: UpdateVariedadDto,
  ) {
    return this.productos.updateVariedad(productoId, variedadId, dto);
  }

  @Delete(':productoId/variedades/:variedadId')
  removeVariedad(
    @Param('productoId') productoId: string,
    @Param('variedadId') variedadId: string,
  ) {
    return this.productos.removeVariedad(productoId, variedadId);
  }
}
