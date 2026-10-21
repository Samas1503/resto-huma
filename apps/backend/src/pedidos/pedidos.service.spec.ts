import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PedidosService } from './pedidos.service.js';
import { ComandasService } from './comandas.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { RealtimeGateway } from '../realtime/realtime.gateway.js';
import type { StockService } from '@resto-huma/shared';
import type { JwtUser } from '../common/index.js';

const mozo: JwtUser = { sub: 'mozo1', email: 'mozo@local.ar', rol: 'mozo' };
const cajero: JwtUser = { sub: 'cajero1', email: 'caja@local.ar', rol: 'cajero' };

const itemBase = (over = {}) => ({
  id: 'i1',
  pedidoId: 'ped1',
  comandaId: 'c1',
  productoId: 'p1',
  variedadId: null,
  cantidad: 2,
  presentacion: 'unidad' as const,
  notas: null,
  precioUnitarioArs: 100,
  precioUnitarioUsd: new Prisma.Decimal('0.10'),
  subtotalArs: 200,
  ...over,
});

const comandaBase = (over = {}) => ({
  id: 'c1',
  pedidoId: 'ped1',
  confirmadaPorId: null,
  origen: 'mozo' as const,
  estado: 'pendiente' as const,
  notas: null,
  createdAt: new Date('2026-01-01T12:00:00Z'),
  items: [itemBase()],
  ...over,
});

const pedidoBase = (over = {}) => ({
  id: 'ped1',
  turnoId: 't1',
  mesaId: 'm1',
  clienteId: null,
  mozoId: 'mozo1',
  repartidorId: null,
  reservaId: null,
  canal: 'presencial' as const,
  subtipo: 'mesa' as const,
  estadoAtencion: 'confirmado' as const,
  estadoPago: 'pendiente_de_cobro' as const,
  direccionSnapshot: null,
  costoEnvioArs: 0,
  motivoCancelacion: null,
  createdAt: new Date('2026-01-01T12:00:00Z'),
  confirmadoAt: new Date('2026-01-01T12:00:00Z'),
  listoAt: null,
  entregadoAt: null,
  items: [itemBase()],
  comandas: [comandaBase()],
  ...over,
});

function makePrisma() {
  const prisma: Record<string, unknown> = {};
  const model = () => ({
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  });
  Object.assign(prisma, {
    turno: model(),
    mesa: model(),
    direccion: model(),
    producto: model(),
    variedad: model(),
    pedido: model(),
    comanda: model(),
    itemPedido: model(),
    $transaction: vi.fn((cb: (tx: unknown) => unknown) => cb(prisma)),
  });
  return prisma as {
    [k: string]: ReturnType<typeof model>;
  } & { $transaction: ReturnType<typeof vi.fn> };
}

function makeRealtime() {
  return {
    emitComandaNueva: vi.fn(),
    emitComandaEstado: vi.fn(),
    emitPedidoEstado: vi.fn(),
    emitPedidoVirtualNuevo: vi.fn(),
  };
}

const productoOk = {
  id: 'p1',
  nombre: 'Empanada',
  categoria: 'empanada' as const,
  precioArs: 100,
  precioUsd: new Prisma.Decimal('0.10'),
  disponible: true,
  activo: true,
};

describe('PedidosService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let realtime: ReturnType<typeof makeRealtime>;
  let stock: { descontarPorPedido: ReturnType<typeof vi.fn> };
  let service: PedidosService;

  beforeEach(() => {
    prisma = makePrisma();
    realtime = makeRealtime();
    stock = { descontarPorPedido: vi.fn() };
    service = new PedidosService(
      prisma as unknown as PrismaService,
      realtime as unknown as RealtimeGateway,
      stock as StockService,
    );
    prisma.turno.findFirst.mockResolvedValue({ id: 't1' });
    prisma.mesa.findUnique.mockResolvedValue({ id: 'm1', estado: 'libre' });
    prisma.producto.findUnique.mockResolvedValue(productoOk);
  });

  it('crea pedido presencial de mesa: nace confirmado, con comanda, ocupa la mesa y descuenta stock', async () => {
    prisma.pedido.create.mockResolvedValue({ id: 'ped1' });
    prisma.comanda.create.mockResolvedValue({ id: 'c1' });
    prisma.pedido.findUnique.mockResolvedValue(pedidoBase());

    const dto = {
      canal: 'presencial',
      subtipo: 'mesa',
      mesaId: 'm1',
      items: [{ productoId: 'p1', cantidad: 2 }],
    };
    const result = await service.crear(dto as never, mozo);

    expect(prisma.pedido.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          estadoAtencion: 'confirmado',
          mozoId: 'mozo1',
          turnoId: 't1',
        }),
      }),
    );
    expect(prisma.comanda.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ origen: 'mozo' }),
      }),
    );
    expect(prisma.itemPedido.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            precioUnitarioArs: 100,
            subtotalArs: 200,
            comandaId: 'c1',
          }),
        ],
      }),
    );
    expect(prisma.mesa.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { estado: 'ocupada' } }),
    );
    expect(stock.descontarPorPedido).toHaveBeenCalledWith('ped1');
    expect(realtime.emitComandaNueva).toHaveBeenCalled();
    expect(result.estadoAtencion).toBe('confirmado');
  });

  it('crea pedido virtual takeaway: queda pendiente y emite pedido.virtual.nuevo (sin comanda ni stock)', async () => {
    prisma.pedido.create.mockResolvedValue({ id: 'ped2' });
    prisma.pedido.findUnique.mockResolvedValue(
      pedidoBase({
        id: 'ped2',
        canal: 'virtual',
        subtipo: 'takeaway',
        mesaId: null,
        estadoAtencion: 'pendiente',
        comandas: [],
      }),
    );

    await service.crear(
      {
        canal: 'virtual',
        subtipo: 'takeaway',
        items: [{ productoId: 'p1', cantidad: 1 }],
      } as never,
      mozo,
    );

    expect(prisma.comanda.create).not.toHaveBeenCalled();
    expect(stock.descontarPorPedido).not.toHaveBeenCalled();
    expect(realtime.emitPedidoVirtualNuevo).toHaveBeenCalled();
  });

  it('rechaza delivery sin dirección (ni snapshot ni dirección de cliente)', async () => {
    prisma.direccion.findFirst.mockResolvedValue(null);
    await expect(
      service.crear(
        {
          canal: 'virtual',
          subtipo: 'delivery',
          items: [{ productoId: 'p1', cantidad: 1 }],
        } as never,
        mozo,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('usa la dirección principal del cliente como snapshot en delivery', async () => {
    prisma.direccion.findFirst
      .mockResolvedValueOnce({ calle: 'Belgrano 123', ciudad: 'Salta', referencia: null });
    prisma.pedido.create.mockResolvedValue({ id: 'ped3' });
    prisma.pedido.findUnique.mockResolvedValue(
      pedidoBase({ canal: 'virtual', subtipo: 'delivery', estadoAtencion: 'pendiente', comandas: [] }),
    );

    await service.crear(
      {
        canal: 'virtual',
        subtipo: 'delivery',
        clienteId: 'cl1',
        items: [{ productoId: 'p1', cantidad: 1 }],
      } as never,
      mozo,
    );

    expect(prisma.pedido.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ direccionSnapshot: 'Belgrano 123, Salta' }),
      }),
    );
  });

  it('rechaza combinaciones canal/subtipo inválidas', async () => {
    await expect(
      service.crear(
        { canal: 'presencial', subtipo: 'delivery', items: [{ productoId: 'p1', cantidad: 1 }] } as never,
        mozo,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.crear(
        { canal: 'presencial', subtipo: 'mesa', items: [{ productoId: 'p1', cantidad: 1 }] } as never,
        mozo,
      ),
    ).rejects.toBeInstanceOf(BadRequestException); // mesa sin mesaId
  });

  it('rechaza crear pedido sin turno abierto', async () => {
    prisma.turno.findFirst.mockResolvedValue(null);
    await expect(
      service.crear(
        {
          canal: 'virtual',
          subtipo: 'takeaway',
          items: [{ productoId: 'p1', cantidad: 1 }],
        } as never,
        mozo,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('confirmar pedido virtual genera comanda de sistema, descuenta stock y emite eventos', async () => {
    prisma.pedido.findUnique
      .mockResolvedValueOnce(pedidoBase({ canal: 'virtual', subtipo: 'takeaway', estadoAtencion: 'pendiente', comandas: [] }))
      .mockResolvedValue(
        pedidoBase({
          canal: 'virtual',
          subtipo: 'takeaway',
          estadoAtencion: 'confirmado',
          comandas: [comandaBase({ id: 'c2', origen: 'sistema' })],
        }),
      );
    prisma.itemPedido.findMany.mockResolvedValue([{ id: 'i1' }]);
    prisma.comanda.create.mockResolvedValue({ id: 'c2' });

    await service.cambiarEstado('ped1', { estado: 'confirmado' }, cajero);

    expect(prisma.comanda.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ origen: 'sistema', confirmadaPorId: 'cajero1' }),
      }),
    );
    expect(stock.descontarPorPedido).toHaveBeenCalledWith('ped1');
    expect(realtime.emitComandaNueva).toHaveBeenCalled();
    expect(realtime.emitPedidoEstado).toHaveBeenCalledWith('ped1', 'confirmado');
  });

  it('rechaza transiciones inválidas de estadoAtencion', async () => {
    prisma.pedido.findUnique.mockResolvedValue(pedidoBase({ estadoAtencion: 'entregado' }));
    await expect(
      service.cambiarEstado('ped1', { estado: 'pendiente' }, mozo),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rechaza cancelación sin motivo y entrega directa de delivery sin reparto', async () => {
    prisma.pedido.findUnique.mockResolvedValue(pedidoBase({ estadoAtencion: 'pendiente' }));
    await expect(
      service.cambiarEstado('ped1', { estado: 'cancelado' }, mozo),
    ).rejects.toBeInstanceOf(BadRequestException);

    prisma.pedido.findUnique.mockResolvedValue(
      pedidoBase({ estadoAtencion: 'listo', subtipo: 'delivery', canal: 'virtual' }),
    );
    await expect(
      service.cambiarEstado('ped1', { estado: 'entregado' }, mozo),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('adición genera NUEVA comanda en el mismo pedido y descuenta el delta de stock', async () => {
    prisma.pedido.findUnique
      .mockResolvedValueOnce(pedidoBase({ estadoAtencion: 'confirmado' }))
      .mockResolvedValue(
        pedidoBase({ comandas: [comandaBase(), comandaBase({ id: 'c9' })] }),
      );
    prisma.comanda.create.mockResolvedValue({ id: 'c9' });

    const result = await service.agregarItems(
      'ped1',
      { items: [{ productoId: 'p1', cantidad: 3 }] },
      mozo,
    );

    expect(prisma.comanda.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ pedidoId: 'ped1' }) }),
    );
    expect(prisma.itemPedido.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [expect.objectContaining({ comandaId: 'c9', subtotalArs: 300 })],
      }),
    );
    expect(realtime.emitComandaNueva).toHaveBeenCalled();
    expect(stock.descontarPorPedido).toHaveBeenCalledWith('ped1');
    expect(result.comandas).toHaveLength(2);
  });

  it('rechaza adiciones sobre pedidos entregados/cancelados/pendientes', async () => {
    prisma.pedido.findUnique.mockResolvedValue(pedidoBase({ estadoAtencion: 'entregado' }));
    await expect(
      service.agregarItems('ped1', { items: [{ productoId: 'p1', cantidad: 1 }] }, mozo),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('marcarPagado pasa estadoPago a cobrado y rechaza doble cobro', async () => {
    prisma.pedido.findUnique
      .mockResolvedValueOnce(pedidoBase())
      .mockResolvedValue(pedidoBase({ estadoPago: 'cobrado' }));

    const result = await service.marcarPagado('ped1');
    expect(prisma.pedido.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { estadoPago: 'cobrado' } }),
    );
    expect(result.estadoPago).toBe('cobrado');
    await expect(service.marcarPagado('ped1')).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('ComandasService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let realtime: ReturnType<typeof makeRealtime>;
  let service: ComandasService;

  beforeEach(() => {
    prisma = makePrisma();
    realtime = makeRealtime();
    service = new ComandasService(
      prisma as unknown as PrismaService,
      realtime as unknown as RealtimeGateway,
    );
  });

  it('comanda en_preparacion mueve el pedido confirmado a en_preparacion', async () => {
    prisma.comanda.findUnique.mockResolvedValue(comandaBase());
    prisma.comanda.update.mockResolvedValue(comandaBase({ estado: 'en_preparacion' }));
    prisma.pedido.findUnique.mockResolvedValue(
      pedidoBase({ estadoAtencion: 'confirmado', comandas: [{ estado: 'en_preparacion' }] }),
    );

    await service.cambiarEstado('c1', { estado: 'en_preparacion' });

    expect(realtime.emitComandaEstado).toHaveBeenCalledWith('c1', 'en_preparacion');
    expect(prisma.pedido.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { estadoAtencion: 'en_preparacion' } }),
    );
    expect(realtime.emitPedidoEstado).toHaveBeenCalledWith('ped1', 'en_preparacion');
  });

  it('todas las comandas listas → pedido listo', async () => {
    prisma.comanda.findUnique.mockResolvedValue(comandaBase({ estado: 'en_preparacion' }));
    prisma.comanda.update.mockResolvedValue(comandaBase({ estado: 'lista' }));
    prisma.pedido.findUnique.mockResolvedValue(
      pedidoBase({ estadoAtencion: 'en_preparacion', comandas: [{ estado: 'lista' }] }),
    );

    await service.cambiarEstado('c1', { estado: 'lista' });

    expect(prisma.pedido.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ estadoAtencion: 'listo' }),
      }),
    );
    expect(realtime.emitPedidoEstado).toHaveBeenCalledWith('ped1', 'listo');
  });

  it('rechaza transición inválida de comanda (lista → pendiente)', async () => {
    prisma.comanda.findUnique.mockResolvedValue(comandaBase({ estado: 'lista' }));
    await expect(
      service.cambiarEstado('c1', { estado: 'pendiente' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
