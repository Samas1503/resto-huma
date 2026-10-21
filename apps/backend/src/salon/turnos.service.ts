import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AbrirTurnoDto } from './dto/abrir-turno.dto.js';
import { AsignarMozoMesaDto } from './dto/asignar-mozo-mesa.dto.js';

const includeAsignaciones = {
  mozoMesaTurnos: {
    include: {
      usuario: { select: { id: true, nombre: true, rol: true } },
      mesa: { select: { id: true, numero: true, zona: true } },
    },
  },
} as const;

@Injectable()
export class TurnosService {
  constructor(private prisma: PrismaService) {}

  async abrir(dto: AbrirTurnoDto) {
    const abierto = await this.prisma.turno.findFirst({ where: { tipo: dto.tipo, cierre: null } });
    if (abierto) throw new ConflictException(`Ya hay un turno de ${dto.tipo} abierto`);
    return this.prisma.turno.create({ data: { tipo: dto.tipo, apertura: new Date() } });
  }

  async cerrar(id: string) {
    const turno = await this.findOne(id);
    if (turno.cierre) throw new ConflictException('El turno ya está cerrado');
    return this.prisma.turno.update({ where: { id }, data: { cierre: new Date() } });
  }

  findAll() {
    return this.prisma.turno.findMany({ orderBy: { apertura: 'desc' }, include: includeAsignaciones });
  }

  async findOne(id: string) {
    const turno = await this.prisma.turno.findUnique({ where: { id }, include: includeAsignaciones });
    if (!turno) throw new NotFoundException('Turno no encontrado');
    return turno;
  }

  async asignar(turnoId: string, dto: AsignarMozoMesaDto) {
    const turno = await this.findOne(turnoId);
    if (turno.cierre) throw new ConflictException('No se puede asignar en un turno cerrado');

    const mozo = await this.prisma.usuario.findUnique({ where: { id: dto.usuarioId } });
    if (!mozo) throw new NotFoundException('Usuario no encontrado');
    if (mozo.rol !== 'mozo') throw new BadRequestException('El usuario asignado debe tener rol mozo');

    const mesa = await this.prisma.mesa.findUnique({ where: { id: dto.mesaId } });
    if (!mesa) throw new NotFoundException('Mesa no encontrada');

    const ocupada = await this.prisma.mozoMesaTurno.findFirst({ where: { turnoId, mesaId: dto.mesaId } });
    if (ocupada) throw new ConflictException('La mesa ya tiene un mozo asignado en este turno');

    return this.prisma.mozoMesaTurno.create({
      data: { turnoId, usuarioId: dto.usuarioId, mesaId: dto.mesaId },
      include: { usuario: { select: { id: true, nombre: true } }, mesa: true, turno: true },
    });
  }

  async desasignar(asignacionId: string) {
    const asignacion = await this.prisma.mozoMesaTurno.findUnique({ where: { id: asignacionId } });
    if (!asignacion) throw new NotFoundException('Asignación no encontrada');
    return this.prisma.mozoMesaTurno.delete({ where: { id: asignacionId } });
  }
}
