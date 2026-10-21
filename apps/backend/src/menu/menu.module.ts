import { Module } from '@nestjs/common';
import { CartaController } from './carta.controller.js';
import { ProductosController } from './productos.controller.js';
import { PromocionesController } from './promociones.controller.js';
import { ProductosService } from './productos.service.js';
import { PromocionesService } from './promociones.service.js';
import { DescuentosService } from './descuentos.service.js';

// Módulo menú: Producto/Variedad/Promocion(+Producto) + helper de DescuentoAplicado.
// DescuentosService y ProductosService se exportan para pedidos (B4):
// calcular precios vigentes y descuentos de un carrito.
@Module({
  controllers: [CartaController, ProductosController, PromocionesController],
  providers: [ProductosService, PromocionesService, DescuentosService],
  exports: [ProductosService, PromocionesService, DescuentosService],
})
export class MenuModule {}
