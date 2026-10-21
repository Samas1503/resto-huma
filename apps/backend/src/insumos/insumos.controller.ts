import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { Auth } from '../common/index.js';
import { ActualizarInsumoBodyDto, CrearInsumoBodyDto } from './dto/insumo.dto.js';
import { InsumosService } from './insumos.service.js';

@Controller('insumos')
export class InsumosController {
  constructor(private insumos: InsumosService) {}

  @Get()
  @Auth('admin', 'mozo')
  findAll() {
    return this.insumos.findAll();
  }

  // Alerta de stock bajo (UC35) — declarada antes de ':id'
  @Get('stock-bajo')
  @Auth('admin', 'mozo')
  findStockBajo() {
    return this.insumos.findStockBajo();
  }

  @Get(':id')
  @Auth('admin', 'mozo')
  findOne(@Param('id') id: string) {
    return this.insumos.findOne(id);
  }

  // Gestión de insumos/recetas/stock = UC26, rol admin
  @Post()
  @Auth('admin')
  create(@Body() dto: CrearInsumoBodyDto) {
    return this.insumos.create(dto);
  }

  @Patch(':id')
  @Auth('admin')
  update(@Param('id') id: string, @Body() dto: ActualizarInsumoBodyDto) {
    return this.insumos.update(id, dto);
  }

  @Delete(':id')
  @Auth('admin')
  remove(@Param('id') id: string) {
    return this.insumos.remove(id);
  }
}
