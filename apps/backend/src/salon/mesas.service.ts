import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EstadoMesa } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CrearMesaDto } from './dto/crear-mesa.dto.js';
import { ActualizarMesaDto } from './dto/actualizar-mesa.dto.js';

// Ciclo de la mesa según GLOSARIO.MD: libre → ocupada → cuenta_pedida → libre
const TRANSICIONES: Record<EstadoMesa, EstadoMesa[]> = {
  libre: [EstadoMesa.ocupada],
  ocupada: [EstadoMesa.cuenta_pedida, EstadoMesa.libre],
  cuenta_pedida: [EstadoMesa.libre],
};

@Injectable()
export class MesasService {
  constructor(private prisma: PrismaService) {}

  async crear(dto: CrearMesaDto) {
    const existente = await this.prisma.mesa.findUnique({ where: { numero: dto.numero } });
    if (existente) throw new ConflictException(`Ya existe una mesa con el número ${dto.numero}`);
    return this.prisma.mesa.create({ data: dto });
  }

  findAll() {
    return this.prisma.mesa.findMany({ orderBy: { numero: 'asc' } });
  }

  async findOne(id: string) {
    const mesa = await this.prisma.mesa.findUnique({ where: { id } });
    if (!mesa) throw new NotFoundException('Mesa no encontrada');
    return mesa;
  }

  async actualizar(id: string, dto: ActualizarMesaDto) {
    await this.findOne(id);
    if (dto.numero !== undefined) {
      const existente = await this.prisma.mesa.findUnique({ where: { numero: dto.numero } });
      if (existente && existente.id !== id)
        throw new ConflictException(`Ya existe una mesa con el número ${dto.numero}`);
    }
    return this.prisma.mesa.update({ where: { id }, data: dto });
  }

  async cambiarEstado(id: string, estado: EstadoMesa) {
    const mesa = await this.findOne(id);
    if (mesa.estado === estado) return mesa;
    if (!TRANSICIONES[mesa.estado].includes(estado))
      throw new BadRequestException(`Transición inválida de mesa: ${mesa.estado} → ${estado}`);
    return this.prisma.mesa.update({ where: { id }, data: { estado } });
  }

  async eliminar(id: string) {
    await this.findOne(id);
    const [reservas, pedidos] = await Promise.all([
      this.prisma.reserva.count({ where: { mesaId: id } }),
      this.prisma.pedido.count({ where: { mesaId: id } }),
    ]);
    if (reservas + pedidos > 0)
      throw new ConflictException('No se puede eliminar una mesa con reservas o pedidos asociados');
    await this.prisma.mozoMesaTurno.deleteMany({ where: { mesaId: id } });
    return this.prisma.mesa.delete({ where: { id } });
  }
}
