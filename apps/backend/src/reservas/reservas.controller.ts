import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { EstadoReserva } from '@prisma/client';
import { Auth } from '../common/index.js';
import { ReservasService } from './reservas.service.js';
import { CrearReservaDto } from './dto/crear-reserva.dto.js';
import { ActualizarReservaDto } from './dto/actualizar-reserva.dto.js';

@Controller('reservas')
export class ReservasController {
  constructor(private reservas: ReservasService) {}

  @Post('publica')
  crearPublica(@Body() dto: CrearReservaDto) {
    return this.reservas.crear(dto);
  }

  @Post()
  @Auth('admin', 'mozo')
  crear(@Body() dto: CrearReservaDto) {
    return this.reservas.crear(dto);
  }

  @Get()
  @Auth('admin', 'mozo')
  findAll(@Query('estado') estado?: EstadoReserva) {
    return this.reservas.findAll(estado);
  }

  // Reservas del día (estilo Eat App): ?fecha=YYYY-MM-DD, default = hoy
  @Get('del-dia')
  @Auth('admin', 'mozo')
  delDia(@Query('fecha') fecha?: string) {
    return this.reservas.delDia(fecha);
  }

  @Get(':id')
  @Auth('admin', 'mozo')
  findOne(@Param('id') id: string) {
    return this.reservas.findOne(id);
  }

  @Patch(':id')
  @Auth('admin', 'mozo')
  actualizar(@Param('id') id: string, @Body() dto: ActualizarReservaDto) {
    return this.reservas.actualizar(id, dto);
  }

  @Delete(':id')
  @Auth('admin')
  eliminar(@Param('id') id: string) {
    return this.reservas.eliminar(id);
  }
}
