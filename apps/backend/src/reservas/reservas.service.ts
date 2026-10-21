import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EstadoReserva } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CrearReservaDto } from './dto/crear-reserva.dto.js';
import { ActualizarReservaDto } from './dto/actualizar-reserva.dto.js';

// Ventana de solapamiento: una mesa no puede tener dos reservas activas a ±2h
const VENTANA_RESERVA_MS = 2 * 60 * 60 * 1000;
const ESTADOS_ACTIVOS: EstadoReserva[] = [EstadoReserva.pendiente, EstadoReserva.confirmada];

@Injectable()
export class ReservasService {
  constructor(private prisma: PrismaService) {}

  async crear(dto: CrearReservaDto) {
    const cliente = dto.clienteId
      ? await this.prisma.cliente.findUnique({ where: { id: dto.clienteId } })
      : null;
    if (dto.clienteId && !cliente) throw new NotFoundException('Cliente no encontrado');

    const mesa = dto.mesaId
      ? await this.prisma.mesa.findUnique({ where: { id: dto.mesaId } })
      : null;
    if (dto.mesaId && !mesa) throw new NotFoundException('Mesa no encontrada');
    if (mesa && dto.cantidadPersonas > mesa.capacidad)
      throw new BadRequestException('La cantidad de personas supera la capacidad de la mesa');

    const fechaHora = new Date(dto.fechaHora);
    if (dto.mesaId) await this.verificarSolapamiento(dto.mesaId, fechaHora);

    return this.prisma.reserva.create({
      data: {
        clienteId: dto.clienteId,
        mesaId: dto.mesaId ?? null,
        fechaHora,
        cantidadPersonas: dto.cantidadPersonas,
        telefonoContacto: dto.telefonoContacto,
        notas: dto.notas,
      },
      include: this.includeBase,
    });
  }

  findAll(estado?: EstadoReserva) {
    if (estado && !Object.values(EstadoReserva).includes(estado))
      throw new BadRequestException(`Estado de reserva inválido: ${estado}`);
    return this.prisma.reserva.findMany({
      where: estado ? { estado } : undefined,
      orderBy: { fechaHora: 'asc' },
      include: this.includeBase,
    });
  }

  delDia(fecha?: string) {
    const base = fecha ? new Date(`${fecha}T00:00:00`) : new Date();
    const desde = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    const hasta = new Date(desde.getTime() + 24 * 60 * 60 * 1000);
    return this.prisma.reserva.findMany({
      where: { fechaHora: { gte: desde, lt: hasta } },
      orderBy: { fechaHora: 'asc' },
      include: this.includeBase,
    });
  }

  async findOne(id: string) {
    const reserva = await this.prisma.reserva.findUnique({ where: { id }, include: this.includeBase });
    if (!reserva) throw new NotFoundException('Reserva no encontrada');
    return reserva;
  }

  async actualizar(id: string, dto: ActualizarReservaDto) {
    await this.findOne(id);
    if (dto.mesaId) {
      const mesa = await this.prisma.mesa.findUnique({ where: { id: dto.mesaId } });
      if (!mesa) throw new NotFoundException('Mesa no encontrada');
    }
    if (dto.clienteId) {
      const cliente = await this.prisma.cliente.findUnique({ where: { id: dto.clienteId } });
      if (dto.clienteId && !cliente) throw new NotFoundException('Cliente no encontrado');
    }
    return this.prisma.reserva.update({
      where: { id },
      data: { ...({ ...dto } as object), fechaHora: dto.fechaHora ? new Date(dto.fechaHora) : undefined },
      include: this.includeBase,
    });
  }

  async eliminar(id: string) {
    await this.findOne(id);
    return this.prisma.reserva.delete({ where: { id } });
  }

  private async verificarSolapamiento(mesaId: string, fechaHora: Date) {
    const conflicto = await this.prisma.reserva.findFirst({
      where: {
        mesaId,
        estado: { in: ESTADOS_ACTIVOS },
        fechaHora: {
          gte: new Date(fechaHora.getTime() - VENTANA_RESERVA_MS),
          lte: new Date(fechaHora.getTime() + VENTANA_RESERVA_MS),
        },
      },
    });
    if (conflicto) throw new ConflictException('La mesa ya tiene una reserva activa en ese horario');
  }

  private readonly includeBase = {
    cliente: { select: { id: true, nombre: true, telefono: true } },
    mesa: { select: { id: true, numero: true, zona: true, capacidad: true } },
  } as const;
}
