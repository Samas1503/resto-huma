import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Auth, CurrentUser, type JwtUser } from '../common/index.js';
import { CrearMovimientoStockBodyDto } from './dto/movimiento-stock.dto.js';
import { InsumosStockService } from './stock.service.js';

@Controller('movimientos-stock')
export class MovimientosController {
  constructor(private stock: InsumosStockService) {}

  // Auditoría de movimientos; filtrable por ?insumoId=
  @Get()
  @Auth('admin', 'mozo')
  findAll(@Query('insumoId') insumoId?: string) {
    return this.stock.findMovimientos(insumoId);
  }

  // Entrada por compra o ajuste manual (cantidad con signo)
  @Post()
  @Auth('admin')
  create(@Body() dto: CrearMovimientoStockBodyDto, @CurrentUser() user: JwtUser) {
    return this.stock.registrarMovimiento(dto, user.sub);
  }
}
