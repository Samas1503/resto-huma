import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Auth } from '../common/index.js';
import { ActualizarRecetaItemBodyDto, CrearRecetaItemBodyDto } from './dto/receta-item.dto.js';
import { RecetasService } from './recetas.service.js';

@Controller('recetas')
export class RecetasController {
  constructor(private recetas: RecetasService) {}

  // ?productoId= requerido; ?variedadId= opcional (solo ajustes de esa variedad)
  @Get()
  @Auth('admin', 'mozo')
  findByProducto(@Query('productoId') productoId: string, @Query('variedadId') variedadId?: string) {
    return this.recetas.findByProducto(productoId, variedadId);
  }

  @Get(':id')
  @Auth('admin', 'mozo')
  findOne(@Param('id') id: string) {
    return this.recetas.findOne(id);
  }

  @Post()
  @Auth('admin')
  create(@Body() dto: CrearRecetaItemBodyDto) {
    return this.recetas.create(dto);
  }

  @Patch(':id')
  @Auth('admin')
  update(@Param('id') id: string, @Body() dto: ActualizarRecetaItemBodyDto) {
    return this.recetas.update(id, dto);
  }

  @Delete(':id')
  @Auth('admin')
  remove(@Param('id') id: string) {
    return this.recetas.remove(id);
  }
}
