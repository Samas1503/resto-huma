import { Body, Controller, Get, Post, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { Auth, CurrentUser } from '../common/index.js';
import type { JwtUser } from '../common/index.js';
import { CobrosService } from './cobros.service.js';
import { CrearPagoDto } from './dto/crear-pago.dto.js';

// Cobros presenciales/encargados por el cajero (pagos mixtos + propina) sobre la caja abierta.
@Controller('finanzas/pagos')
@Auth('cajero', 'admin')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class FinanzasPagosController {
  constructor(private cobros: CobrosService) {}

  @Post()
  registrar(@Body() dto: CrearPagoDto, @CurrentUser() user: JwtUser) {
    return this.cobros.registrarPago(dto, user.sub);
  }

  @Get()
  listar(@Query('pedidoId') pedidoId?: string) {
    return this.cobros.listar(pedidoId);
  }
}
