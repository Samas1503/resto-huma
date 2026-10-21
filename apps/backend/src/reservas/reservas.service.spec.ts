import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { EstadoReserva } from '@prisma/client';
import { ReservasService } from './reservas.service.js';

const prismaMock = () => ({
  reserva: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn((a: any) => a.data),
    update: vi.fn((a: any) => a.data),
    delete: vi.fn(),
  },
  cliente: { findUnique: vi.fn() },
  mesa: { findUnique: vi.fn() },
});

describe('ReservasService', () => {
  let prisma: ReturnType<typeof prismaMock>;
  let service: ReservasService;

  beforeEach(() => {
    prisma = prismaMock();
    service = new ReservasService(prisma as any);
  });

  const dto = {
    clienteId: 'c1',
    mesaId: 'm1',
    fechaHora: '2026-10-21T20:00:00.000Z',
    cantidadPersonas: 4,
    telefonoContacto: '388123456',
  };

  it('crea una reserva pendiente', async () => {
    prisma.cliente.findUnique.mockResolvedValue({ id: 'c1' });
    prisma.mesa.findUnique.mockResolvedValue({ id: 'm1', capacidad: 6 });
    prisma.reserva.findFirst.mockResolvedValue(null);
    await expect(service.crear(dto)).resolves.toMatchObject({ mesaId: 'm1' });
  });

  it('crea reserva sin clienteId (cliente opcional)', async () => {
    prisma.mesa.findUnique.mockResolvedValue({ id: 'm1', capacidad: 6 });
    prisma.reserva.findFirst.mockResolvedValue(null);
    prisma.reserva.create.mockResolvedValue({ id: 'r1', clienteId: null });
    await expect(service.crear({ ...dto, clienteId: undefined })).resolves.toMatchObject({ clienteId: null });
    expect(prisma.cliente.findUnique).not.toHaveBeenCalled();
  });

  it('rechaza si supera la capacidad de la mesa', async () => {
    prisma.cliente.findUnique.mockResolvedValue({ id: 'c1' });
    prisma.mesa.findUnique.mockResolvedValue({ id: 'm1', capacidad: 2 });
    await expect(service.crear(dto)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza solapamiento con otra reserva activa de la mesa', async () => {
    prisma.cliente.findUnique.mockResolvedValue({ id: 'c1' });
    prisma.mesa.findUnique.mockResolvedValue({ id: 'm1', capacidad: 6 });
    prisma.reserva.findFirst.mockResolvedValue({ id: 'r0' });
    await expect(service.crear(dto)).rejects.toBeInstanceOf(ConflictException);
  });

  it('del-dia filtra por rango de fecha', async () => {
    prisma.reserva.findMany.mockResolvedValue([]);
    await service.delDia('2026-10-21');
    const where = prisma.reserva.findMany.mock.calls[0][0].where;
    expect(where.fechaHora.gte.getDate()).toBe(21);
    expect(where.fechaHora.lt.getDate()).toBe(22);
  });

  it('rechaza estado inválido en el filtro', () => {
    expect(() => service.findAll('xyz' as EstadoReserva)).toThrow(BadRequestException);
  });

  it('lanza NotFound si la reserva no existe', async () => {
    prisma.reserva.findUnique.mockResolvedValue(null);
    await expect(service.findOne('nope')).rejects.toBeInstanceOf(NotFoundException);
  });
});
