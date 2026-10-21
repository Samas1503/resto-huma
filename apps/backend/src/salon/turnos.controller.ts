import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { Auth } from '../common/index.js';
import { TurnosService } from './turnos.service.js';
import { AbrirTurnoDto } from './dto/abrir-turno.dto.js';
import { AsignarMozoMesaDto } from './dto/asignar-mozo-mesa.dto.js';

@Controller('turnos')
export class TurnosController {
  constructor(private turnos: TurnosService) {}

  @Post()
  @Auth('admin')
  abrir(@Body() dto: AbrirTurnoDto) {
    return this.turnos.abrir(dto);
  }

  @Post(':id/cerrar')
  @Auth('admin')
  cerrar(@Param('id') id: string) {
    return this.turnos.cerrar(id);
  }

  @Get()
  @Auth('admin', 'mozo')
  findAll() {
    return this.turnos.findAll();
  }

  @Get(':id')
  @Auth('admin', 'mozo')
  findOne(@Param('id') id: string) {
    return this.turnos.findOne(id);
  }

  @Post(':id/asignaciones')
  @Auth('admin')
  asignar(@Param('id') turnoId: string, @Body() dto: AsignarMozoMesaDto) {
    return this.turnos.asignar(turnoId, dto);
  }

  @Delete('asignaciones/:asignacionId')
  @Auth('admin')
  desasignar(@Param('asignacionId') asignacionId: string) {
    return this.turnos.desasignar(asignacionId);
  }
}
