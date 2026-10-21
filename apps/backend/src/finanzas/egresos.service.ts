import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CajaService } from './caja.service.js';
import { CrearEgresoDto } from './dto/crear-egreso.dto.js';

@Injectable()
export class EgresosService {
  constructor(
    private prisma: PrismaService,
    private caja: CajaService,
  ) {}

  async crear(dto: CrearEgresoDto, usuarioId: string) {
    const caja = await this.caja.obtenerAbierta();
    return this.prisma.egreso.create({
      data: {
        cajaId: caja.id,
        usuarioId,
        categoria: dto.categoria,
        montoArs: dto.montoArs,
        descripcion: dto.descripcion,
      },
    });
  }

  listar(cajaId?: string) {
    return this.prisma.egreso.findMany({
      where: cajaId ? { cajaId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { usuario: { select: { id: true, nombre: true } } },
    });
  }
}
