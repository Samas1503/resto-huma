import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  calcularDescuentos,
  DescuentoCalculado,
  ItemCarrito,
  PromoCalculo,
} from './descuentos.calc.js';

// Helper de dominio (consumido por pedidos B4): dado un carrito/pedido
// calcula los DescuentoAplicado resultantes de las promociones vigentes.
@Injectable()
export class DescuentosService {
  constructor(private prisma: PrismaService) {}

  // Promociones activas y dentro de su rango de fechas (null = sin límite)
  async promocionesVigentes(fecha = new Date()) {
    const promos = await this.prisma.promocion.findMany({
      where: {
        activa: true,
        AND: [
          { OR: [{ fechaInicio: null }, { fechaInicio: { lte: fecha } }] },
          { OR: [{ fechaFin: null }, { fechaFin: { gte: fecha } }] },
        ],
      },
      include: { productos: true },
    });
    return promos;
  }

  // Calcula los descuentos aplicables a un carrito/pedido.
  // Devuelve uno por promo aplicable; la política de acumulación la define pedidos.
  async calcular(items: ItemCarrito[], fecha = new Date()): Promise<DescuentoCalculado[]> {
    const promos = await this.promocionesVigentes(fecha);
    const input: PromoCalculo[] = promos.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      tipo: p.tipo,
      valor: Number(p.valor),
      productos: p.productos.map((pp) => ({ productoId: pp.productoId, variedadId: pp.variedadId })),
    }));
    return calcularDescuentos(items, input);
  }
}
