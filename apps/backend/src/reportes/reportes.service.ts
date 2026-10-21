import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, Presentacion } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProductosTopQueryDto, RangoFechasQueryDto } from './dto/reportes-query.dto.js';

// ─── Constantes de dominio ───────────────────────────────────
// Día de negocio en hora argentina (ART, sin DST; cubre todo el país).
const TZ_AR = 'America/Argentina/Buenos_Aires';
const diaFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ_AR });

// Unidades de producto por presentación (empanadas: docena = 12, media = 6).
const UNIDADES_POR_PRESENTACION: Record<Presentacion, number> = {
  unidad: 1,
  media_docena: 6,
  docena: 12,
};

// ─── Tipos de respuesta ──────────────────────────────────────
export interface VentaTurnoFila {
  fecha: string; // YYYY-MM-DD (hora AR)
  turnoId: string;
  turnoTipo: string;
  canal: string;
  subtipo: string;
  cantidadPedidos: number;
  itemsArs: number;
  costoEnvioArs: number;
  totalArs: number;
}

export interface VentasReporte {
  desde: string | null;
  hasta: string | null;
  cantidadPedidos: number;
  totalArs: number;
  filas: VentaTurnoFila[];
}

export interface ProductoTopItem {
  posicion: number;
  productoId: string;
  producto: string;
  variedadId: string | null;
  variedad: string | null;
  unidadesVendidas: number;
  totalArs: number;
  porPresentacion: Partial<Record<Presentacion, number>>;
}

export interface InsumoCostoFila {
  insumoId: string;
  insumo: string;
  unidadMedida: string;
  cantidadConsumida: number;
  costoUnitarioArs: number;
  costoArs: number;
}

export interface CostoMercaderiaReporte {
  desde: string | null;
  hasta: string | null;
  ventasArs: number;
  costoMercaderiaArs: number;
  margenArs: number;
  margenPct: number | null; // null si no hubo ventas
  detalleInsumos: InsumoCostoFila[];
}

export interface CajaReporte {
  caja: {
    id: string;
    estado: string;
    apertura: Date;
    montoInicialArs: number;
    turno: { tipo: string; apertura: Date; cierre: Date | null } | null;
    abiertaPor: { id: string; nombre: string } | null;
  } | null;
  conciliacion: {
    ingresosPorMedio: Record<string, { cantidad: number; montoArs: number; propinaArs: number }>;
    ingresosArs: number;
    propinasArs: number;
    egresosPorCategoria: Record<string, { cantidad: number; montoArs: number }>;
    egresosArs: number;
    esperadoEfectivoArs: number; // montoInicial + cobros en efectivo − egresos
  } | null;
  cierre: {
    ingresosEsperadosArs: number;
    egresosEsperadosArs: number;
    dineroFisicoArs: number;
    diferenciaArs: number;
    createdAt: Date;
    cerradoPor: { id: string; nombre: string } | null;
  } | null;
}

const LIMITE_TOP_DEFAULT = 10;

@Injectable()
export class ReportesService {
  constructor(private readonly prisma: PrismaService) {}

  // GET /reportes/ventas — totalArs por día/turno, agrupado por canal/subtipo.
  // Venta = pedido cobrado sin anulaciones (MODELO.MD §S1 + glosario Anulación).
  async ventas(query: RangoFechasQueryDto): Promise<VentasReporte> {
    const pedidoWhere = this.pedidosCobradosWhere(query);

    // 1) Agregación Prisma: subtotal por pedido cobrado.
    const totalesPorPedido = await this.prisma.itemPedido.groupBy({
      by: ['pedidoId'],
      where: { pedido: pedidoWhere },
      _sum: { subtotalArs: true },
    });
    if (totalesPorPedido.length === 0) {
      return { desde: query.desde ?? null, hasta: query.hasta ?? null, cantidadPedidos: 0, totalArs: 0, filas: [] };
    }

    // 2) Metadata de esos pedidos (canal, subtipo, turno, envío).
    const pedidos = await this.prisma.pedido.findMany({
      where: { id: { in: totalesPorPedido.map((t) => t.pedidoId) } },
      select: {
        id: true,
        canal: true,
        subtipo: true,
        turnoId: true,
        costoEnvioArs: true,
        createdAt: true,
        turno: { select: { tipo: true } },
      },
    });
    const subtotalPorPedido = new Map(totalesPorPedido.map((t) => [t.pedidoId, t._sum.subtotalArs ?? 0]));

    // 3) Bucket por (fecha, turno, canal, subtipo).
    const buckets = new Map<string, VentaTurnoFila>();
    for (const p of pedidos) {
      const fecha = diaFmt.format(p.createdAt);
      const key = `${fecha}|${p.turnoId}|${p.canal}|${p.subtipo}`;
      const fila =
        buckets.get(key) ??
        ({
          fecha,
          turnoId: p.turnoId,
          turnoTipo: p.turno.tipo,
          canal: p.canal,
          subtipo: p.subtipo,
          cantidadPedidos: 0,
          itemsArs: 0,
          costoEnvioArs: 0,
          totalArs: 0,
        } satisfies VentaTurnoFila);
      const itemsArs = subtotalPorPedido.get(p.id) ?? 0;
      fila.cantidadPedidos += 1;
      fila.itemsArs += itemsArs;
      fila.costoEnvioArs += p.costoEnvioArs;
      fila.totalArs += itemsArs + p.costoEnvioArs;
      buckets.set(key, fila);
    }
    const filas = [...buckets.values()].sort((a, b) => a.fecha.localeCompare(b.fecha));
    return {
      desde: query.desde ?? null,
      hasta: query.hasta ?? null,
      cantidadPedidos: pedidos.length,
      totalArs: filas.reduce((acc, f) => acc + f.totalArs, 0),
      filas,
    };
  }

  // GET /reportes/productos-top — ítems más vendidos por cantidad (normalizada a
  // unidades: docena=12, media_docena=6), con variedad.
  async productosTop(query: ProductosTopQueryDto) {
    const limite = this.parseLimite(query.limite);
    const pedidoWhere = this.pedidosCobradosWhere(query);

    // Agregación Prisma: cantidad/subtotal por producto+variedad+presentación.
    const grupos = await this.prisma.itemPedido.groupBy({
      by: ['productoId', 'variedadId', 'presentacion'],
      where: { pedido: pedidoWhere },
      _sum: { cantidad: true, subtotalArs: true },
    });

    // Merge por (producto, variedad) normalizando a unidades.
    const merge = new Map<
      string,
      { productoId: string; variedadId: string | null; unidades: number; totalArs: number; porPresentacion: Partial<Record<Presentacion, number>> }
    >();
    for (const g of grupos) {
      const key = `${g.productoId}|${g.variedadId ?? ''}`;
      const cantidad = g._sum.cantidad ?? 0;
      const item =
        merge.get(key) ??
        { productoId: g.productoId, variedadId: g.variedadId, unidades: 0, totalArs: 0, porPresentacion: {} };
      item.unidades += cantidad * UNIDADES_POR_PRESENTACION[g.presentacion];
      item.totalArs += g._sum.subtotalArs ?? 0;
      item.porPresentacion[g.presentacion] = (item.porPresentacion[g.presentacion] ?? 0) + cantidad;
      merge.set(key, item);
    }

    const top = [...merge.values()].sort((a, b) => b.unidades - a.unidades).slice(0, limite);

    // Nombres de producto/variedad para la respuesta.
    const [productos, variedades] = await Promise.all([
      this.prisma.producto.findMany({
        where: { id: { in: [...new Set(top.map((t) => t.productoId))] } },
        select: { id: true, nombre: true },
      }),
      this.prisma.variedad.findMany({
        where: { id: { in: top.map((t) => t.variedadId).filter((v): v is string => v !== null) } },
        select: { id: true, nombre: true },
      }),
    ]);
    const nombreProducto = new Map(productos.map((p) => [p.id, p.nombre]));
    const nombreVariedad = new Map(variedades.map((v) => [v.id, v.nombre]));

    const items: ProductoTopItem[] = top.map((t, i) => ({
      posicion: i + 1,
      productoId: t.productoId,
      producto: nombreProducto.get(t.productoId) ?? t.productoId,
      variedadId: t.variedadId,
      variedad: t.variedadId ? (nombreVariedad.get(t.variedadId) ?? t.variedadId) : null,
      unidadesVendidas: t.unidades,
      totalArs: t.totalArs,
      porPresentacion: t.porPresentacion,
    }));
    return { desde: query.desde ?? null, hasta: query.hasta ?? null, limite, items };
  }

  // GET /reportes/costo-mercaderia — Σ movimientos descuento_pedido × costoUnitario
  // del insumo vs ventas cobradas del período → margen bruto.
  async costoMercaderia(query: RangoFechasQueryDto): Promise<CostoMercaderiaReporte> {
    const rango = this.rangoWhere(query);

    // 1) Agregación Prisma: cantidad consumida por insumo (negativa = salida).
    const consumos = await this.prisma.movimientoStock.groupBy({
      by: ['insumoId'],
      where: { tipo: 'descuento_pedido', ...(rango ? { createdAt: rango } : {}) },
      _sum: { cantidad: true },
    });

    // 2) Costo unitario de cada insumo → costo = −cantidad × costoUnitario.
    const insumos = await this.prisma.insumo.findMany({
      where: { id: { in: consumos.map((c) => c.insumoId) } },
      select: { id: true, nombre: true, unidadMedida: true, costoUnitario: true },
    });
    const insumoPorId = new Map(insumos.map((i) => [i.id, i]));

    let costoTotal = new Prisma.Decimal(0);
    const detalleInsumos: InsumoCostoFila[] = consumos.map((c) => {
      const insumo = insumoPorId.get(c.insumoId);
      const cantidad = (c._sum.cantidad ?? new Prisma.Decimal(0)).neg(); // salida → positivo
      const costo = cantidad.mul(insumo?.costoUnitario ?? 0);
      costoTotal = costoTotal.add(costo);
      return {
        insumoId: c.insumoId,
        insumo: insumo?.nombre ?? c.insumoId,
        unidadMedida: insumo?.unidadMedida ?? '',
        cantidadConsumida: cantidad.toNumber(),
        costoUnitarioArs: insumo?.costoUnitario.toNumber() ?? 0,
        costoArs: costo.toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP).toNumber(),
      };
    });
    detalleInsumos.sort((a, b) => b.costoArs - a.costoArs);

    // 3) Ventas del período = Σ subtotalArs de ítems de pedidos cobrados.
    const ventas = await this.prisma.itemPedido.aggregate({
      where: { pedido: this.pedidosCobradosWhere(query) },
      _sum: { subtotalArs: true },
    });
    const ventasArs = ventas._sum.subtotalArs ?? 0;
    const costoMercaderiaArs = costoTotal.toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP).toNumber();
    const margenArs = ventasArs - costoMercaderiaArs;

    return {
      desde: query.desde ?? null,
      hasta: query.hasta ?? null,
      ventasArs,
      costoMercaderiaArs,
      margenArs,
      margenPct: ventasArs > 0 ? Math.round((margenArs / ventasArs) * 10000) / 100 : null,
      detalleInsumos,
    };
  }

  // GET /reportes/caja — caja abierta (conciliación en vivo) o último cierre.
  async caja(): Promise<CajaReporte> {
    const caja = await this.prisma.caja.findFirst({
      orderBy: { apertura: 'desc' },
      include: {
        turno: { select: { tipo: true, apertura: true, cierre: true } },
        abiertaPor: { select: { id: true, nombre: true } },
        cierre: { include: { cerradoPor: { select: { id: true, nombre: true } } } },
      },
    });
    if (!caja) return { caja: null, conciliacion: null, cierre: null };

    // Agregaciones Prisma: ingresos por medio de pago y egresos por categoría.
    const [pagosPorMedio, egresosPorCategoria] = await Promise.all([
      this.prisma.pago.groupBy({
        by: ['medioPago'],
        where: { cajaId: caja.id },
        _sum: { montoArs: true, propinaArs: true },
        _count: { _all: true },
      }),
      this.prisma.egreso.groupBy({
        by: ['categoria'],
        where: { cajaId: caja.id },
        _sum: { montoArs: true },
        _count: { _all: true },
      }),
    ]);

    const ingresosPorMedio: Record<string, { cantidad: number; montoArs: number; propinaArs: number }> = {};
    let ingresosArs = 0;
    let propinasArs = 0;
    let efectivoArs = 0;
    for (const p of pagosPorMedio) {
      const monto = p._sum.montoArs ?? 0;
      const propina = p._sum.propinaArs ?? 0;
      ingresosPorMedio[p.medioPago] = { cantidad: p._count._all, montoArs: monto, propinaArs: propina };
      ingresosArs += monto;
      propinasArs += propina;
      if (p.medioPago === 'efectivo') efectivoArs = monto;
    }

    const egresosMap: Record<string, { cantidad: number; montoArs: number }> = {};
    let egresosArs = 0;
    for (const e of egresosPorCategoria) {
      const monto = e._sum.montoArs ?? 0;
      egresosMap[e.categoria] = { cantidad: e._count._all, montoArs: monto };
      egresosArs += monto;
    }

    return {
      caja: {
        id: caja.id,
        estado: caja.estado,
        apertura: caja.apertura,
        montoInicialArs: caja.montoInicialArs,
        turno: caja.turno,
        abiertaPor: caja.abiertaPor,
      },
      conciliacion: {
        ingresosPorMedio,
        ingresosArs,
        propinasArs,
        egresosPorCategoria: egresosMap,
        egresosArs,
        esperadoEfectivoArs: caja.montoInicialArs + efectivoArs - egresosArs,
      },
      cierre: caja.cierre
        ? {
            ingresosEsperadosArs: caja.cierre.ingresosEsperadosArs,
            egresosEsperadosArs: caja.cierre.egresosEsperadosArs,
            dineroFisicoArs: caja.cierre.dineroFisicoArs,
            diferenciaArs: caja.cierre.diferenciaArs,
            createdAt: caja.cierre.createdAt,
            cerradoPor: caja.cierre.cerradoPor,
          }
        : null,
    };
  }

  // ─── Helpers ───────────────────────────────────────────────

  // Pedido cobrado y no anulado dentro del rango (una anulación revierte la venta).
  private pedidosCobradosWhere(query: RangoFechasQueryDto): Prisma.PedidoWhereInput {
    const createdAt = this.rangoWhere(query);
    return {
      estadoPago: 'cobrado',
      anulaciones: { none: {} },
      ...(createdAt ? { createdAt } : {}),
    };
  }

  // `desde` → gte; `hasta` solo-fecha (YYYY-MM-DD) → día inclusive (lt día siguiente).
  // Fechas sin hora se interpretan en hora argentina (−03:00), no UTC.
  private rangoWhere(query: RangoFechasQueryDto): Prisma.DateTimeFilter | undefined {
    const { desde, hasta } = query;
    if (!desde && !hasta) return undefined;

    const filter: Prisma.DateTimeFilter = {};
    if (desde) {
      const d = this.parseFecha(desde, 'desde');
      filter.gte = d;
    }
    if (hasta) {
      const h = this.parseFecha(hasta, 'hasta');
      if (/^\d{4}-\d{2}-\d{2}$/.test(hasta)) {
        h.setUTCDate(h.getUTCDate() + 1);
        filter.lt = h;
      } else {
        filter.lte = h;
      }
    }
    const fin = filter.lte ?? filter.lt;
    if (filter.gte && fin && filter.gte >= fin) {
      throw new BadRequestException('Rango inválido: "desde" debe ser anterior a "hasta"');
    }
    return filter;
  }

  private parseFecha(valor: string, nombre: string): Date {
    const soloFecha = /^\d{4}-\d{2}-\d{2}$/.test(valor);
    const d = new Date(soloFecha ? `${valor}T00:00:00-03:00` : valor);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException(`Parámetro "${nombre}" inválido (usar ISO 8601)`);
    }
    return d;
  }

  private parseLimite(limite: number | string | undefined): number {
    const n = Number(limite ?? LIMITE_TOP_DEFAULT);
    if (!Number.isInteger(n) || n < 1 || n > 100) {
      throw new BadRequestException('Parámetro "limite" inválido (entero entre 1 y 100)');
    }
    return n;
  }
}
