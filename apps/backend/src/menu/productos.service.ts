import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Producto, Variedad } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateProductoDto } from './dto/create-producto.dto.js';
import { UpdateProductoDto } from './dto/update-producto.dto.js';
import { CreateVariedadDto } from './dto/create-variedad.dto.js';
import { UpdateVariedadDto } from './dto/update-variedad.dto.js';

// Mensajes cuando una FK histórica (pedidos, promos, recetas) impide el borrado físico
const MSG_PRODUCTO_EN_USO =
  'El producto tiene registros asociados (pedidos, promociones o recetas). Desactivalo con PATCH activo=false.';
const MSG_VARIEDAD_EN_USO =
  'La variedad tiene registros asociados. Marcalá como disponible=false en su lugar.';

@Injectable()
export class ProductosService {
  constructor(private prisma: PrismaService) {}

  // ─── Carta pública ────────────────────────────────────────
  // Solo productos activos + disponibles, con sus variedades disponibles
  carta() {
    return this.prisma.producto.findMany({
      where: { activo: true, disponible: true },
      include: { variedades: { where: { disponible: true }, orderBy: { nombre: 'asc' } } },
      orderBy: [{ categoria: 'asc' }, { nombre: 'asc' }],
    });
  }

  // ─── Admin: Producto ──────────────────────────────────────
  findAll() {
    return this.prisma.producto.findMany({
      include: { variedades: { orderBy: { nombre: 'asc' } } },
      orderBy: [{ categoria: 'asc' }, { nombre: 'asc' }],
    });
  }

  async findOne(id: string) {
    const producto = await this.prisma.producto.findUnique({
      where: { id },
      include: { variedades: { orderBy: { nombre: 'asc' } } },
    });
    if (!producto) throw new NotFoundException('Producto no encontrado');
    return producto;
  }

  create(dto: CreateProductoDto) {
    const { precioUsd, ...resto } = dto;
    return this.prisma.producto.create({
      data: { ...resto, precioUsd: new Prisma.Decimal(precioUsd) },
      include: { variedades: true },
    });
  }

  async update(id: string, dto: UpdateProductoDto) {
    await this.findOne(id);
    const { precioUsd, ...resto } = dto;
    return this.prisma.producto.update({
      where: { id },
      data: { ...resto, ...(precioUsd !== undefined && { precioUsd: new Prisma.Decimal(precioUsd) }) },
      include: { variedades: { orderBy: { nombre: 'asc' } } },
    });
  }

  // Borrado físico; si hay historial asociado → 409 y se sugiere desactivar
  async remove(id: string) {
    await this.findOne(id);
    try {
      return await this.prisma.producto.delete({ where: { id } });
    } catch (e) {
      if (esErrorFk(e)) throw new ConflictException(MSG_PRODUCTO_EN_USO);
      throw e;
    }
  }

  // ─── Admin: Variedad (anidada en producto) ────────────────
  async createVariedad(productoId: string, dto: CreateVariedadDto) {
    await this.findOne(productoId);
    return this.prisma.variedad.create({
      data: {
        productoId,
        nombre: dto.nombre,
        precioArs: dto.precioArs ?? null,
        precioUsd: dto.precioUsd !== undefined ? new Prisma.Decimal(dto.precioUsd) : null,
      },
    });
  }

  async updateVariedad(productoId: string, variedadId: string, dto: UpdateVariedadDto) {
    await this.findVariedad(productoId, variedadId);
    const { precioUsd, ...resto } = dto;
    return this.prisma.variedad.update({
      where: { id: variedadId },
      data: {
        ...resto,
        ...(precioUsd !== undefined && {
          precioUsd: precioUsd === null ? null : new Prisma.Decimal(precioUsd),
        }),
      },
    });
  }

  async removeVariedad(productoId: string, variedadId: string) {
    await this.findVariedad(productoId, variedadId);
    try {
      return await this.prisma.variedad.delete({ where: { id: variedadId } });
    } catch (e) {
      if (esErrorFk(e)) throw new ConflictException(MSG_VARIEDAD_EN_USO);
      throw e;
    }
  }

  private async findVariedad(productoId: string, variedadId: string): Promise<Variedad> {
    const variedad = await this.prisma.variedad.findFirst({
      where: { id: variedadId, productoId },
    });
    if (!variedad) throw new NotFoundException('Variedad no encontrada en este producto');
    return variedad;
  }

  // Precio vigente de una variedad (override o precio del producto) — útil para pedidos
  precioVigente(producto: Producto, variedad?: Variedad | null) {
    return {
      precioArs: variedad?.precioArs ?? producto.precioArs,
      precioUsd: variedad?.precioUsd ?? producto.precioUsd,
    };
  }
}

// P2003 = FK constraint, P2014 = violación de relación requerida al borrar
function esErrorFk(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError && (e.code === 'P2003' || e.code === 'P2014')
  );
}
