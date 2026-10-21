import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ActualizarInsumoBodyDto, CrearInsumoBodyDto } from './dto/insumo.dto.js';

@Injectable()
export class InsumosService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.insumo.findMany({ orderBy: { nombre: 'asc' } });
  }

  // Alerta de stock bajo (UC35): stockActual <= stockMinimo
  findStockBajo() {
    return this.prisma.insumo.findMany({
      where: { stockActual: { lte: this.prisma.insumo.fields.stockMinimo } },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: string) {
    const insumo = await this.prisma.insumo.findUnique({ where: { id } });
    if (!insumo) throw new NotFoundException('Insumo no encontrado');
    return insumo;
  }

  create(dto: CrearInsumoBodyDto) {
    // El contrato no expone stock inicial: arranca en 0 y se carga vía movimientos
    const { nombre, unidadMedida, stockMinimo, costoUnitario } = dto;
    return this.prisma.insumo.create({ data: { nombre, unidadMedida, stockMinimo, costoUnitario, stockActual: 0 } });
  }

  async update(id: string, dto: ActualizarInsumoBodyDto) {
    await this.findOne(id);
    return this.prisma.insumo.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    const [recetas, movimientos] = await Promise.all([
      this.prisma.recetaItem.count({ where: { insumoId: id } }),
      this.prisma.movimientoStock.count({ where: { insumoId: id } }),
    ]);
    if (recetas > 0 || movimientos > 0) {
      throw new ConflictException('El insumo tiene recetas o movimientos de stock asociados');
    }
    return this.prisma.insumo.delete({ where: { id } });
  }
}
