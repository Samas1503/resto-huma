import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { EstadoMesa } from '@prisma/client';
import { MesasService } from './mesas.service.js';

const prismaMock = () => ({
  mesa: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn((a: any) => a.data),
    update: vi.fn((a: any) => ({ id: a.where.id, ...a.data })),
    delete: vi.fn(),
  },
  reserva: { count: vi.fn().mockResolvedValue(0) },
  pedido: { count: vi.fn().mockResolvedValue(0) },
  mozoMesaTurno: { deleteMany: vi.fn() },
});

describe('MesasService', () => {
  let prisma: ReturnType<typeof prismaMock>;
  let service: MesasService;

  beforeEach(() => {
    prisma = prismaMock();
    service = new MesasService(prisma as any);
  });

  it('crea una mesa libre con número único', async () => {
    prisma.mesa.findUnique.mockResolvedValue(null);
    await expect(service.crear({ numero: 1, capacidad: 4 })).resolves.toMatchObject({ numero: 1 });
  });

  it('rechaza número de mesa duplicado', async () => {
    prisma.mesa.findUnique.mockResolvedValue({ id: 'm1' });
    await expect(service.crear({ numero: 1, capacidad: 4 })).rejects.toBeInstanceOf(ConflictException);
  });

  it('ciclo de estados: libre → ocupada → cuenta_pedida → libre', async () => {
    prisma.mesa.findUnique.mockResolvedValue({ id: 'm1', estado: EstadoMesa.libre });
    await expect(service.cambiarEstado('m1', EstadoMesa.ocupada)).resolves.toMatchObject({ estado: 'ocupada' });

    prisma.mesa.findUnique.mockResolvedValue({ id: 'm1', estado: EstadoMesa.ocupada });
    await expect(service.cambiarEstado('m1', EstadoMesa.libre)).resolves.toMatchObject({ estado: 'libre' });
  });

  it('rechaza transición inválida libre → cuenta_pedida', async () => {
    prisma.mesa.findUnique.mockResolvedValue({ id: 'm1', estado: EstadoMesa.libre });
    await expect(service.cambiarEstado('m1', EstadoMesa.cuenta_pedida)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza transición inválida cuenta_pedida → ocupada', async () => {
    prisma.mesa.findUnique.mockResolvedValue({ id: 'm1', estado: EstadoMesa.cuenta_pedida });
    await expect(service.cambiarEstado('m1', EstadoMesa.ocupada)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lanza NotFound si la mesa no existe', async () => {
    prisma.mesa.findUnique.mockResolvedValue(null);
    await expect(service.findOne('nope')).rejects.toBeInstanceOf(NotFoundException);
  });
});
