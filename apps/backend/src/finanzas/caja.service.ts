import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { MedioPago } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AbrirCajaDto } from './dto/abrir-caja.dto.js';
import { CerrarCajaDto } from './dto/cerrar-caja.dto.js';

@Injectable()
export class CajaService {
  constructor(private prisma: PrismaService) {}

  /** Caja actualmente abierta; lanza error si no hay (los cobros/egresos la requieren). */
  async obtenerAbierta() {
    const caja = await this.prisma.caja.findFirst({ where: { estado: 'abierta' } });
    if (!caja) throw new BadRequestException('No hay una caja abierta');
    return caja;
  }

  async abrir(dto: AbrirCajaDto, abiertaPorId: string) {
    const abierta = await this.prisma.caja.findFirst({ where: { estado: 'abierta' } });
    if (abierta) throw new ConflictException('Ya hay una caja abierta');

    const turno = dto.turnoId
      ? await this.prisma.turno.findUnique({ where: { id: dto.turnoId } })
      : await this.prisma.turno.findFirst({ where: { cierre: null }, orderBy: { apertura: 'desc' } });
    if (!turno) throw new NotFoundException('No hay un turno abierto para asociar la caja');
    if (turno.cierre) throw new BadRequestException('El turno indicado ya está cerrado');

    return this.prisma.caja.create({
      data: { turnoId: turno.id, abiertaPorId, montoInicialArs: dto.montoInicialArs },
    });
  }

  /** Cierre con conciliación: esperado en cajón = inicial + efectivo cobrado (con propina) − egresos. */
  async cerrar(dto: CerrarCajaDto, cerradoPorId: string) {
    const caja = await this.obtenerAbierta();
    const [pagos, egresosAgg] = await Promise.all([
      this.prisma.pago.findMany({ where: { cajaId: caja.id, anulaciones: { none: {} } } }),
      this.prisma.egreso.aggregate({ where: { cajaId: caja.id }, _sum: { montoArs: true } }),
    ]);
    const ingresosEsperadosArs = pagos
      .filter((p) => p.medioPago === MedioPago.efectivo)
      .reduce((acc, p) => acc + p.montoArs + p.propinaArs, 0);
    const egresosEsperadosArs = egresosAgg._sum.montoArs ?? 0;
    const esperadoEnCajon = caja.montoInicialArs + ingresosEsperadosArs - egresosEsperadosArs;

    return this.prisma.$transaction(async (tx) => {
      await tx.caja.update({ where: { id: caja.id }, data: { estado: 'cerrada' } });
      return tx.cierreCaja.create({
        data: {
          cajaId: caja.id,
          cerradoPorId,
          ingresosEsperadosArs,
          egresosEsperadosArs,
          dineroFisicoArs: dto.dineroFisicoArs,
          diferenciaArs: dto.dineroFisicoArs - esperadoEnCajon,
        },
      });
    });
  }

  actual() {
    return this.prisma.caja.findFirst({
      where: { estado: 'abierta' },
      include: { turno: true, abiertaPor: { select: { id: true, nombre: true } } },
    });
  }

  historial() {
    return this.prisma.caja.findMany({
      orderBy: { apertura: 'desc' },
      take: 50,
      include: {
        turno: true,
        abiertaPor: { select: { id: true, nombre: true } },
        cierre: true,
      },
    });
  }

  /** Resumen/reporte de ventas de la caja (turno): ingresos por medio, propinas, egresos por categoría. */
  async resumen(cajaId: string) {
    const caja = await this.prisma.caja.findUnique({
      where: { id: cajaId },
      include: { turno: true, cierre: true },
    });
    if (!caja) throw new NotFoundException('Caja no encontrada');

    const [pagos, egresos] = await Promise.all([
      this.prisma.pago.findMany({ where: { cajaId, anulaciones: { none: {} } } }),
      this.prisma.egreso.findMany({ where: { cajaId } }),
    ]);

    const porMedio = {} as Record<MedioPago, number>;
    let propinasArs = 0;
    for (const p of pagos) {
      porMedio[p.medioPago] = (porMedio[p.medioPago] ?? 0) + p.montoArs;
      propinasArs += p.propinaArs;
    }
    const porCategoria = egresos.reduce<Record<string, number>>((acc, e) => {
      acc[e.categoria] = (acc[e.categoria] ?? 0) + e.montoArs;
      return acc;
    }, {});
    const ingresosEfectivo = (porMedio[MedioPago.efectivo] ?? 0) +
      pagos.filter((p) => p.medioPago === MedioPago.efectivo).reduce((a, p) => a + p.propinaArs, 0);
    const totalEgresos = egresos.reduce((a, e) => a + e.montoArs, 0);

    return {
      caja,
      ingresos: {
        totalArs: pagos.reduce((a, p) => a + p.montoArs, 0),
        propinasArs,
        cantidadPagos: pagos.length,
        porMedio,
      },
      egresos: { totalArs: totalEgresos, cantidad: egresos.length, porCategoria },
      esperadoEfectivoArs: caja.montoInicialArs + ingresosEfectivo - totalEgresos,
    };
  }
}
