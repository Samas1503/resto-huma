import { Body, Controller, Get, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { Auth, CurrentUser } from '../common/index.js';
import type { JwtUser } from '../common/index.js';
import { AnulacionesService } from './anulaciones.service.js';
import { CrearAnulacionDto } from './dto/crear-anulacion.dto.js';

@Controller('finanzas/anulaciones')
@Auth('admin')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class AnulacionesController {
  constructor(private anulaciones: AnulacionesService) {}

  @Post()
  crear(@Body() dto: CrearAnulacionDto, @CurrentUser() user: JwtUser) {
    return this.anulaciones.crear(dto, user.sub);
  }

  @Get()
  listar() {
    return this.anulaciones.listar();
  }
}
