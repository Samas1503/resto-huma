import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CajaService } from './caja.service.js';
import { CobrosService } from './cobros.service.js';
import type { RealtimeEmitter } from './tokens.js';

const makePrisma = () => ({
  pedido: { findUnique: vi.fn(), update: vi.fn() },
  pago: { create: vi.fn((args) => ({ id: 'pago1', ...args.data })) },
  caja: { findFirst: vi.fn() },
});

const pedidoBase = {
  id: 'ped1',
  estadoPago: 'pendiente_de_cobro',
  estadoAtencion: 'entregado',
  costoEnvioArs: 0,
};

// Pedido como lo devuelve el include de reevaluarPagoPedido.
const pedidoConCuenta = (pagos: { montoArs: number }[], overrides: Record<string, unknown> = {}) => ({
  ...pedidoBase,
  items: [{ id: 'it1', subtotalArs: 1000 }],
  descuentos: [],
  anulaciones: [],
  pagos,
  ...overrides,
});

const makeService = (prisma = makePrisma(), realtime?: RealtimeEmitter) => {
  const caja = { obtenerAbierta: vi.fn().mockResolvedValue({ id: 'caja1' }) };
  const service = new CobrosService(prisma as never, caja as unknown as CajaService, realtime);
  return { service, prisma, caja };
};

describe('CobrosService.registrarPago (pago mixto)', () => {
  it('pago parcial no marca cobrado', async () => {
    const { service, prisma } = makeService();
    prisma.pedido.findUnique
      .mockResolvedValueOnce(pedidoBase)
      .mockResolvedValueOnce(pedidoConCuenta([{ montoArs: 600 }]));

    const res = await service.registrarPago({ pedidoId: 'ped1', montoArs: 600, medioPago: 'efectivo' }, 'u1');

    expect(res.cobrado).toBe(false);
    expect(res.restanteArs).toBe(400);
    expect(prisma.pedido.update).not.toHaveBeenCalled();
  });

  it('al completar el total marca estadoPago=cobrado y emite pago.confirmado', async () => {
    const realtime = { emit: vi.fn() };
    const { service, prisma } = makeService(undefined, realtime);
    prisma.pedido.findUnique
      .mockResolvedValueOnce(pedidoBase)
      .mockResolvedValueOnce(pedidoConCuenta([{ montoArs: 600 }, { montoArs: 400 }]));

    const res = await service.registrarPago(
      { pedidoId: 'ped1', montoArs: 400, medioPago: 'debito' },
      'u1',
    );

    expect(res.cobrado).toBe(true);
    expect(prisma.pedido.update).toHaveBeenCalledWith({
      where: { id: 'ped1' },
      data: { estadoPago: 'cobrado' },
    });
    expect(realtime.emit).toHaveBeenCalledWith('pago.confirmado', { pedidoId: 'ped1', pagoId: 'pago1' });
  });

  it('la propina no cuenta para saldar la cuenta', async () => {
    const { service, prisma } = makeService();
    prisma.pedido.findUnique
      .mockResolvedValueOnce(pedidoBase)
      .mockResolvedValueOnce(pedidoConCuenta([{ montoArs: 900 }]));

    const res = await service.registrarPago(
      { pedidoId: 'ped1', montoArs: 900, medioPago: 'efectivo', propinaArs: 500 },
      'u1',
    );
    expect(res.cobrado).toBe(false);
    expect(res.restanteArs).toBe(100);
  });

  it('aplica descuentos y costo de envío al total', async () => {
    const { service, prisma } = makeService();
    const conDescuento = pedidoConCuenta([{ montoArs: 950 }], {
      costoEnvioArs: 100,
      descuentos: [{ tipo: 'porcentaje', valor: new Prisma.Decimal(10), itemPedidoId: null }],
    });
    prisma.pedido.findUnique.mockResolvedValueOnce(pedidoBase).mockResolvedValueOnce(conDescuento);

    // total = 1000 − 10% (100) + 100 envío = 1000; pagado 950 < 1000
    const res = await service.registrarPago({ pedidoId: 'ped1', montoArs: 950, medioPago: 'credito' }, 'u1');
    expect(res.totalArs).toBe(1000);
    expect(res.cobrado).toBe(false);
  });

  it('rechaza si el pedido ya está cobrado o no existe', async () => {
    const { service, prisma } = makeService();
    prisma.pedido.findUnique.mockResolvedValueOnce({ ...pedidoBase, estadoPago: 'cobrado' });
    await expect(
      service.registrarPago({ pedidoId: 'ped1', montoArs: 100, medioPago: 'efectivo' }, 'u1'),
    ).rejects.toThrow(BadRequestException);

    prisma.pedido.findUnique.mockResolvedValueOnce(null);
    await expect(
      service.registrarPago({ pedidoId: 'x', montoArs: 100, medioPago: 'efectivo' }, 'u1'),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('CobrosService.reevaluarPagoPedido (anulaciones)', () => {
  it('revierte a pendiente_de_cobro si los pagos vigentes ya no cubren', async () => {
    const { service, prisma } = makeService();
    prisma.pedido.findUnique.mockResolvedValue(
      pedidoConCuenta([{ montoArs: 600 }], { estadoPago: 'cobrado' }),
    );
    const res = await service.reevaluarPagoPedido('ped1');
    expect(res.cobrado).toBe(false);
    expect(prisma.pedido.update).toHaveBeenCalledWith({
      where: { id: 'ped1' },
      data: { estadoPago: 'pendiente_de_cobro' },
    });
  });

  it('anulación a nivel pedido ignora todos sus pagos', async () => {
    const { service } = makeService();
    const prisma = makePrisma();
    const svc = new CobrosService(
      prisma as never,
      { obtenerAbierta: vi.fn() } as unknown as CajaService,
    );
    prisma.pedido.findUnique.mockResolvedValue(
      pedidoConCuenta([{ montoArs: 1000 }], { estadoPago: 'cobrado', anulaciones: [{ id: 'a1' }] }),
    );
    const res = await svc.reevaluarPagoPedido('ped1');
    expect(res.pagadoArs).toBe(0);
    expect(res.cobrado).toBe(false);
  });
});
