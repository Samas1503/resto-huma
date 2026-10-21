import { BadRequestException, ConflictException } from '@nestjs/common';
import { CajaService } from './caja.service.js';

const makePrisma = () => ({
  caja: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  turno: { findUnique: vi.fn(), findFirst: vi.fn() },
  pago: { findMany: vi.fn() },
  egreso: { aggregate: vi.fn() },
  cierreCaja: { create: vi.fn((args) => args.data) },
  $transaction: vi.fn(),
});

describe('CajaService', () => {
  it('abrir rechaza si ya hay caja abierta', async () => {
    const prisma = makePrisma();
    prisma.caja.findFirst.mockResolvedValue({ id: 'caja-abierta' });
    const service = new CajaService(prisma as never);
    await expect(service.abrir({ montoInicialArs: 0 }, 'u1')).rejects.toThrow(ConflictException);
  });

  it('cerrar concilia: inicial + efectivo (con propina) − egresos vs dinero físico', async () => {
    const prisma = makePrisma();
    const caja = { id: 'caja1', montoInicialArs: 500, estado: 'abierta' };
    prisma.caja.findFirst.mockResolvedValue(caja);
    prisma.pago.findMany.mockResolvedValue([
      { medioPago: 'efectivo', montoArs: 1000, propinaArs: 100 },
      { medioPago: 'credito', montoArs: 2000, propinaArs: 0 }, // no es efectivo en cajón
    ]);
    prisma.egreso.aggregate.mockResolvedValue({ _sum: { montoArs: 300 } });
    // esperado en cajón = 500 + (1000+100) − 300 = 1300; físico 1250 → diferencia −50
    prisma.$transaction.mockImplementation(async (cb: (tx: typeof prisma) => unknown) => cb(prisma));

    const service = new CajaService(prisma as never);
    const cierre = await service.cerrar({ dineroFisicoArs: 1250 }, 'admin1');

    expect(cierre).toMatchObject({
      cajaId: 'caja1',
      cerradoPorId: 'admin1',
      ingresosEsperadosArs: 1100, // solo efectivo + propinas
      egresosEsperadosArs: 300,
      dineroFisicoArs: 1250,
      diferenciaArs: -50,
    });
    expect(prisma.caja.update).toHaveBeenCalledWith({ where: { id: 'caja1' }, data: { estado: 'cerrada' } });
  });

  it('cerrar sin caja abierta lanza BadRequest', async () => {
    const prisma = makePrisma();
    prisma.caja.findFirst.mockResolvedValue(null);
    const service = new CajaService(prisma as never);
    await expect(service.cerrar({ dineroFisicoArs: 0 }, 'u1')).rejects.toThrow(BadRequestException);
  });
});
