import { Controller, Get } from '@nestjs/common';
import { ProductosService } from './productos.service.js';
import { DescuentosService } from './descuentos.service.js';

// Carta pública: productos activos + disponibles con sus variedades,
// y promociones vigentes (para el portal de pedidos virtuales C6).
// Sin auth — es el menú que ve cualquier cliente.
@Controller('carta')
export class CartaController {
  constructor(
    private productos: ProductosService,
    private descuentos: DescuentosService,
  ) {}

  @Get()
  carta() {
    return this.productos.carta();
  }

  @Get('promociones')
  promociones() {
    return this.descuentos.promocionesVigentes();
  }
}
