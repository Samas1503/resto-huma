import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePromocionDto } from './dto/create-promocion.dto.js';
import { UpdatePromocionDto } from './dto/update-promocion.dto.js';
import { AddPromocionProductoDto } from './dto/add-promocion-producto.dto.js';

const INCLUDE_PRODUCTOS = {
  productos: { include: { producto: true, variedad: true }, orderBy: { id: 'asc' as const } },
};

@Injectable()
export class PromocionesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.promocion.findMany({
      include: INCLUDE_PRODUCTOS,
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: string) {
    const promo = await this.prisma.promocion.findUnique({ where: { id }, include: INCLUDE_PRODUCTOS });
    if (!promo) throw new NotFoundException('Promoción no encontrada');
    return promo;
  }

  async create(dto: CreatePromocionDto) {
    const { productos, ...resto } = dto;
    if (productos?.length) await this.validarComposicion(productos);
    return this.prisma.promocion.create({
      data: {
        ...resto,
        valor: new Prisma.Decimal(dto.valor),
        fechaInicio: dto.fechaInicio ? new Date(dto.fechaInicio) : null,
        fechaFin: dto.fechaFin ? new Date(dto.fechaFin) : null,
        productos: productos?.length ? { create: productos } : undefined,
      },
      include: INCLUDE_PRODUCTOS,
    });
  }

  async update(id: string, dto: UpdatePromocionDto) {
    await this.findOne(id);
    const { valor, fechaInicio, fechaFin, ...resto } = dto;
    return this.prisma.promocion.update({
      where: { id },
      data: {
        ...resto,
        ...(valor !== undefined && { valor: new Prisma.Decimal(valor) }),
        ...(fechaInicio !== undefined && {
          fechaInicio: fechaInicio === null ? null : new Date(fechaInicio),
        }),
        ...(fechaFin !== undefined && { fechaFin: fechaFin === null ? null : new Date(fechaFin) }),
      },
      include: INCLUDE_PRODUCTOS,
    });
  }

  // Borra la promo junto a su composición; si ya generó descuentos en pedidos → 409
  async remove(id: string) {
    await this.findOne(id);
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.promocionProducto.deleteMany({ where: { promocionId: id } });
        return tx.promocion.delete({ where: { id } });
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        (e.code === 'P2003' || e.code === 'P2014')
      ) {
        throw new ConflictException(
          'La promoción tiene descuentos aplicados en pedidos. Desactivala con PATCH activa=false.',
        );
      }
      throw e;
    }
  }

  // ─── Composición (PromocionProducto) ──────────────────────
  async addProducto(promocionId: string, dto: AddPromocionProductoDto) {
    await this.findOne(promocionId);
    await this.validarComposicion([dto]);
    await this.prisma.promocionProducto.create({
      data: { promocionId, productoId: dto.productoId, variedadId: dto.variedadId ?? null },
    });
    return this.findOne(promocionId);
  }

  async removeProducto(promocionId: string, promocionProductoId: string) {
    const entrada = await this.prisma.promocionProducto.findFirst({
      where: { id: promocionProductoId, promocionId },
    });
    if (!entrada) throw new NotFoundException('Producto no encontrado en esta promoción');
    await this.prisma.promocionProducto.delete({ where: { id: promocionProductoId } });
    return this.findOne(promocionId);
  }

  // Valida que cada producto exista y que la variedad (si viene) pertenezca al producto
  private async validarComposicion(productos: AddPromocionProductoDto[]) {
    for (const p of productos) {
      const producto = await this.prisma.producto.findUnique({ where: { id: p.productoId } });
      if (!producto) throw new BadRequestException(`Producto inexistente: ${p.productoId}`);
      if (p.variedadId) {
        const variedad = await this.prisma.variedad.findFirst({
          where: { id: p.variedadId, productoId: p.productoId },
        });
        if (!variedad) {
          throw new BadRequestException(
            `La variedad ${p.variedadId} no pertenece al producto ${p.productoId}`,
          );
        }
      }
    }
  }
}
