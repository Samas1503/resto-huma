import { Body, Controller, Get, Post, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { Auth, CurrentUser } from '../common/index.js';
import type { JwtUser } from '../common/index.js';
import { CrearEgresoDto } from './dto/crear-egreso.dto.js';
import { EgresosService } from './egresos.service.js';

@Controller('finanzas/egresos')
@Auth('cajero', 'admin')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class EgresosController {
  constructor(private egresos: EgresosService) {}

  @Post()
  crear(@Body() dto: CrearEgresoDto, @CurrentUser() user: JwtUser) {
    return this.egresos.crear(dto, user.sub);
  }

  @Get()
  listar(@Query('cajaId') cajaId?: string) {
    return this.egresos.listar(cajaId);
  }
}
