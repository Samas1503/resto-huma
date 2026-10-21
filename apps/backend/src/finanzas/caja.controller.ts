import { Body, Controller, Get, Param, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { Auth, CurrentUser } from '../common/index.js';
import type { JwtUser } from '../common/index.js';
import { CajaService } from './caja.service.js';
import { AbrirCajaDto } from './dto/abrir-caja.dto.js';
import { CerrarCajaDto } from './dto/cerrar-caja.dto.js';

@Controller('caja')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class CajaController {
  constructor(private caja: CajaService) {}

  @Post('abrir')
  @Auth('cajero', 'admin')
  abrir(@Body() dto: AbrirCajaDto, @CurrentUser() user: JwtUser) {
    return this.caja.abrir(dto, user.sub);
  }

  @Post('cerrar')
  @Auth('cajero', 'admin')
  cerrar(@Body() dto: CerrarCajaDto, @CurrentUser() user: JwtUser) {
    return this.caja.cerrar(dto, user.sub);
  }

  @Get('actual')
  @Auth('cajero', 'admin')
  actual() {
    return this.caja.actual();
  }

  @Get()
  @Auth('admin')
  historial() {
    return this.caja.historial();
  }

  /** Reporte de ventas del turno de una caja (conciliación + detalle por medio). */
  @Get(':id/resumen')
  @Auth('cajero', 'admin')
  resumen(@Param('id') id: string) {
    return this.caja.resumen(id);
  }
}
