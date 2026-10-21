import { Controller, Get, Query } from '@nestjs/common';
import { Auth } from '../common/index.js';
import { ProductosTopQueryDto, RangoFechasQueryDto } from './dto/reportes-query.dto.js';
import { ReportesService } from './reportes.service.js';

// Reportes de solo lectura sobre el schema (admin/cajero — GLOSARIO.MD §Roles).
@Controller('reportes')
@Auth('admin', 'cajero')
export class ReportesController {
  constructor(private readonly reportes: ReportesService) {}

  // GET /reportes/ventas?desde&hasta — totalArs por día/turno × canal/subtipo.
  @Get('ventas')
  ventas(@Query() query: RangoFechasQueryDto) {
    return this.reportes.ventas(query);
  }

  // GET /reportes/productos-top?desde&hasta&limite — ítems más vendidos con variedad.
  @Get('productos-top')
  productosTop(@Query() query: ProductosTopQueryDto) {
    return this.reportes.productosTop(query);
  }

  // GET /reportes/costo-mercaderia?desde&hasta — costo de insumos vs ventas = margen.
  @Get('costo-mercaderia')
  costoMercaderia(@Query() query: RangoFechasQueryDto) {
    return this.reportes.costoMercaderia(query);
  }

  // GET /reportes/caja — caja abierta (conciliación en vivo) o último cierre.
  @Get('caja')
  caja() {
    return this.reportes.caja();
  }
}
