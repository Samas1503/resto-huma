import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { Auth } from '../common/index.js';
import { MesasService } from './mesas.service.js';
import { CrearMesaDto } from './dto/crear-mesa.dto.js';
import { ActualizarMesaDto } from './dto/actualizar-mesa.dto.js';
import { CambiarEstadoMesaDto } from './dto/cambiar-estado-mesa.dto.js';

@Controller('mesas')
export class MesasController {
  constructor(private mesas: MesasService) {}

  @Post()
  @Auth('admin')
  crear(@Body() dto: CrearMesaDto) {
    return this.mesas.crear(dto);
  }

  @Get()
  @Auth('admin', 'mozo', 'cocina')
  findAll() {
    return this.mesas.findAll();
  }

  @Get(':id')
  @Auth('admin', 'mozo', 'cocina')
  findOne(@Param('id') id: string) {
    return this.mesas.findOne(id);
  }

  @Patch(':id')
  @Auth('admin')
  actualizar(@Param('id') id: string, @Body() dto: ActualizarMesaDto) {
    return this.mesas.actualizar(id, dto);
  }

  @Patch(':id/estado')
  @Auth('admin', 'mozo')
  cambiarEstado(@Param('id') id: string, @Body() dto: CambiarEstadoMesaDto) {
    return this.mesas.cambiarEstado(id, dto.estado);
  }

  @Delete(':id')
  @Auth('admin')
  eliminar(@Param('id') id: string) {
    return this.mesas.eliminar(id);
  }
}
