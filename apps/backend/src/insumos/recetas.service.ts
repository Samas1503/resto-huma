import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ActualizarRecetaItemBodyDto, CrearRecetaItemBodyDto } from './dto/receta-item.dto.js';

@Injectable()
export class RecetasService {
  constructor(private prisma: PrismaService) {}

  // Receta mixta: devuelve items base (variedadId null) y/o ajustes por variedad
  findByProducto(productoId: string, variedadId?: string) {
    return this.prisma.recetaItem.findMany({
      where: {
        productoId,
        ...(variedadId ? { variedadId } : {}),
      },
      include: { insumo: true, variedad: true },
      orderBy: { insumo: { nombre: 'asc' } },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.recetaItem.findUnique({
      where: { id },
      include: { insumo: true, variedad: true },
    });
    if (!item) throw new NotFoundException('Ítem de receta no encontrado');
    return item;
  }

  create(dto: CrearRecetaItemBodyDto) {
    const { productoId, variedadId, insumoId, cantidad } = dto;
    return this.prisma.recetaItem.create({
      data: { productoId, variedadId: variedadId ?? null, insumoId, cantidad },
      include: { insumo: true, variedad: true },
    });
  }

  async update(id: string, dto: ActualizarRecetaItemBodyDto) {
    await this.findOne(id);
    return this.prisma.recetaItem.update({
      where: { id },
      data: dto,
      include: { insumo: true, variedad: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.recetaItem.delete({ where: { id } });
  }
}
