import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { ReportesService } from './reportes.service.js';

const prismaMock = () => ({
  itemPedido: { groupBy: vi.fn(), aggregate: vi.fn() },
  pedido: { findMany: vi.fn() },
  producto: { findMany: vi.fn() },
  variedad: { findMany: vi.fn() },
  movimientoStock: { groupBy: vi.fn() },
  insumo: { findMany: vi.fn() },
  caja: { findFirst: vi.fn() },
  pago: { groupBy: vi.fn() },
  egreso: { groupBy: vi.fn() },
});

const build = () => {
  const prisma = prismaMock();
  return { prisma, service: new ReportesService(prisma as unknown as PrismaService) };
};

describe('ReportesService', () => {
  describe('ventas', () => {
    it('agrupa totalArs por día/turno/canal/subtipo', async () => {
      const { prisma, service } = build();
      prisma.itemPedido.groupBy.mockResolvedValue([
        { pedidoId: 'p1', _sum: { subtotalArs: 1000 } },
        { pedidoId: 'p2', _sum: { subtotalArs: 500 } },
        { pedidoId: 'p3', _sum: { subtotalArs: 700 } },
      ]);
      prisma.pedido.findMany.mockResolvedValue([
        { id: 'p1', canal: 'presencial', subtipo: 'mesa', turnoId: 't1', costoEnvioArs: 0, createdAt: new Date('2026-10-20T15:00:00Z'), turno: { tipo: 'almuerzo' } },
        { id: 'p2', canal: 'presencial', subtipo: 'mesa', turnoId: 't1', costoEnvioArs: 0, createdAt: new Date('2026-10-20T16:00:00Z'), turno: { tipo: 'almuerzo' } },
        { id: 'p3', canal: 'virtual', subtipo: 'delivery', turnoId: 't2', costoEnvioArs: 300, createdAt: new Date('2026-10-21T02:00:00Z'), turno: { tipo: 'cena' } },
      ]);

      const r = await service.ventas({});

      expect(r.cantidadPedidos).toBe(3);
      expect(r.filas).toHaveLength(2);
      const mesa = r.filas.find((f) => f.subtipo === 'mesa')!;
      expect(mesa).toMatchObject({ fecha: '2026-10-20', canal: 'presencial', cantidadPedidos: 2, itemsArs: 1500, totalArs: 1500 });
      // p3: 02:00 UTC = 23:00 ART del día anterior
      const del = r.filas.find((f) => f.subtipo === 'delivery')!;
      expect(del).toMatchObject({ fecha: '2026-10-20', canal: 'virtual', itemsArs: 700, costoEnvioArs: 300, totalArs: 1000 });
      expect(r.totalArs).toBe(2500);
      // filtra cobrados sin anulaciones
      expect(prisma.itemPedido.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ where: { pedido: expect.objectContaining({ estadoPago: 'cobrado' }) } }),
      );
    });

    it('devuelve vacío si no hay ventas', async () => {
      const { prisma, service } = build();
      prisma.itemPedido.groupBy.mockResolvedValue([]);
      const r = await service.ventas({ desde: '2026-10-01', hasta: '2026-10-20' });
      expect(r).toMatchObject({ cantidadPedidos: 0, totalArs: 0, filas: [] });
      expect(prisma.pedido.findMany).not.toHaveBeenCalled();
    });
  });

  describe('productosTop', () => {
    it('normaliza presentaciones a unidades y ordena por cantidad', async () => {
      const { prisma, service } = build();
      prisma.itemPedido.groupBy.mockResolvedValue([
        { productoId: 'prod1', variedadId: 'var1', presentacion: 'docena', _sum: { cantidad: 2, subtotalArs: 2400 } },
        { productoId: 'prod1', variedadId: 'var1', presentacion: 'unidad', _sum: { cantidad: 3, subtotalArs: 300 } },
        { productoId: 'prod2', variedadId: null, presentacion: 'unidad', _sum: { cantidad: 10, subtotalArs: 1500 } },
      ]);
      prisma.producto.findMany.mockResolvedValue([
        { id: 'prod1', nombre: 'Empanada' },
        { id: 'prod2', nombre: 'Locro' },
      ]);
      prisma.variedad.findMany.mockResolvedValue([{ id: 'var1', nombre: 'Carne' }]);

      const r = await service.productosTop({ limite: 10 });

      expect(r.items).toHaveLength(2);
      expect(r.items[0]).toMatchObject({
        posicion: 1,
        producto: 'Empanada',
        variedad: 'Carne',
        unidadesVendidas: 27, // 2×12 + 3
        totalArs: 2700,
        porPresentacion: { docena: 2, unidad: 3 },
      });
      expect(r.items[1]).toMatchObject({ posicion: 2, producto: 'Locro', variedad: null, unidadesVendidas: 10 });
    });

    it('rechaza limite inválido', async () => {
      const { service } = build();
      await expect(service.productosTop({ limite: 'abc' as unknown as number })).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.productosTop({ limite: 0 })).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('costoMercaderia', () => {
    it('calcula costo = −cantidad × costoUnitario y margen vs ventas', async () => {
      const { prisma, service } = build();
      prisma.movimientoStock.groupBy.mockResolvedValue([
        { insumoId: 'i1', _sum: { cantidad: new Prisma.Decimal('-2.500') } },
        { insumoId: 'i2', _sum: { cantidad: new Prisma.Decimal('-10') } },
      ]);
      prisma.insumo.findMany.mockResolvedValue([
        { id: 'i1', nombre: 'Harina', unidadMedida: 'kg', costoUnitario: new Prisma.Decimal('800.00') },
        { id: 'i2', nombre: 'Carne', unidadMedida: 'kg', costoUnitario: new Prisma.Decimal('500.50') },
      ]);
      prisma.itemPedido.aggregate.mockResolvedValue({ _sum: { subtotalArs: 12000 } });

      const r = await service.costoMercaderia({});

      // i1: 2.5×800 = 2000 · i2: 10×500.5 = 5005 → total 7005
      expect(r.costoMercaderiaArs).toBe(7005);
      expect(r.ventasArs).toBe(12000);
      expect(r.margenArs).toBe(4995);
      expect(r.margenPct).toBeCloseTo(41.63);
      expect(r.detalleInsumos[0]).toMatchObject({ insumo: 'Carne', cantidadConsumida: 10, costoArs: 5005 });
      expect(prisma.movimientoStock.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ tipo: 'descuento_pedido' }) }),
      );
    });

    it('margenPct null sin ventas', async () => {
      const { prisma, service } = build();
      prisma.movimientoStock.groupBy.mockResolvedValue([]);
      prisma.insumo.findMany.mockResolvedValue([]);
      prisma.itemPedido.aggregate.mockResolvedValue({ _sum: { subtotalArs: null } });
      const r = await service.costoMercaderia({});
      expect(r).toMatchObject({ ventasArs: 0, costoMercaderiaArs: 0, margenArs: 0, margenPct: null });
    });
  });

  describe('caja', () => {
    it('caja abierta: conciliación en vivo con esperado en efectivo', async () => {
      const { prisma, service } = build();
      prisma.caja.findFirst.mockResolvedValue({
        id: 'c1',
        estado: 'abierta',
        apertura: new Date(),
        montoInicialArs: 5000,
        turno: { tipo: 'cena', apertura: new Date(), cierre: null },
        abiertaPor: { id: 'u1', nombre: 'Cajera' },
        cierre: null,
      });
      prisma.pago.groupBy.mockResolvedValue([
        { medioPago: 'efectivo', _sum: { montoArs: 8000, propinaArs: 500 }, _count: { _all: 4 } },
        { medioPago: 'billetera_virtual', _sum: { montoArs: 3000, propinaArs: 0 }, _count: { _all: 2 } },
      ]);
      prisma.egreso.groupBy.mockResolvedValue([
        { categoria: 'compra_insumos', _sum: { montoArs: 2000 }, _count: { _all: 1 } },
      ]);

      const r = await service.caja();

      expect(r.caja).toMatchObject({ id: 'c1', estado: 'abierta' });
      expect(r.conciliacion).toMatchObject({ ingresosArs: 11000, propinasArs: 500, egresosArs: 2000 });
      // esperado en el cajón: 5000 inicial + 8000 efectivo − 2000 egresos
      expect(r.conciliacion!.esperadoEfectivoArs).toBe(11000);
      expect(r.cierre).toBeNull();
    });

    it('caja cerrada: expone el cierre registrado', async () => {
      const { prisma, service } = build();
      prisma.caja.findFirst.mockResolvedValue({
        id: 'c1', estado: 'cerrada', apertura: new Date(), montoInicialArs: 5000,
        turno: null, abiertaPor: null,
        cierre: {
          ingresosEsperadosArs: 13000, egresosEsperadosArs: 2000,
          dineroFisicoArs: 15900, diferenciaArs: -100,
          createdAt: new Date(), cerradoPor: { id: 'u2', nombre: 'Admin' },
        },
      });
      prisma.pago.groupBy.mockResolvedValue([]);
      prisma.egreso.groupBy.mockResolvedValue([]);

      const r = await service.caja();
      expect(r.cierre).toMatchObject({ dineroFisicoArs: 15900, diferenciaArs: -100 });
    });

    it('sin cajas registradas → nulls', async () => {
      const { prisma, service } = build();
      prisma.caja.findFirst.mockResolvedValue(null);
      expect(await service.caja()).toEqual({ caja: null, conciliacion: null, cierre: null });
    });
  });

  describe('rango de fechas', () => {
    it('hasta solo-fecha se interpreta como día inclusive en hora AR', async () => {
      const { prisma, service } = build();
      prisma.itemPedido.groupBy.mockResolvedValue([]);
      await service.ventas({ desde: '2026-10-01', hasta: '2026-10-20' });
      const where = prisma.itemPedido.groupBy.mock.calls[0][0].where.pedido.createdAt;
      expect(where.gte).toEqual(new Date('2026-10-01T00:00:00-03:00'));
      expect(where.lt).toEqual(new Date('2026-10-21T00:00:00-03:00'));
    });

    it('rechaza fechas inválidas y rangos invertidos', async () => {
      const { service } = build();
      await expect(service.ventas({ desde: 'no-es-fecha' })).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.ventas({ desde: '2026-10-20', hasta: '2026-10-01' })).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
