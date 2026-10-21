import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { TurnosService } from './turnos.service.js';

const prismaMock = () => ({
  turno: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn((a: any) => ({ id: 't1', cierre: null, ...a.data })),
    update: vi.fn((a: any) => ({ id: a.where.id, ...a.data })),
  },
  usuario: { findUnique: vi.fn() },
  mesa: { findUnique: vi.fn() },
  mozoMesaTurno: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
});

describe('TurnosService', () => {
  let prisma: ReturnType<typeof prismaMock>;
  let service: TurnosService;

  beforeEach(() => {
    prisma = prismaMock();
    service = new TurnosService(prisma as any);
  });

  it('abre un turno con cierre null', async () => {
    prisma.turno.findFirst.mockResolvedValue(null);
    const turno = await service.abrir({ tipo: 'almuerzo' });
    expect(turno.cierre).toBeNull();
    expect(turno.tipo).toBe('almuerzo');
  });

  it('rechaza abrir un segundo turno del mismo tipo', async () => {
    prisma.turno.findFirst.mockResolvedValue({ id: 't0', cierre: null });
    await expect(service.abrir({ tipo: 'cena' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('rechaza cerrar un turno ya cerrado', async () => {
    prisma.turno.findUnique.mockResolvedValue({ id: 't1', cierre: new Date() });
    await expect(service.cerrar('t1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('asigna un mozo a una mesa del turno', async () => {
    prisma.turno.findUnique.mockResolvedValue({ id: 't1', cierre: null, mozoMesaTurnos: [] });
    prisma.usuario.findUnique.mockResolvedValue({ id: 'u1', rol: 'mozo' });
    prisma.mesa.findUnique.mockResolvedValue({ id: 'm1' });
    prisma.mozoMesaTurno.findFirst.mockResolvedValue(null);
    prisma.mozoMesaTurno.create.mockResolvedValue({ id: 'a1' });
    await expect(service.asignar('t1', { usuarioId: 'u1', mesaId: 'm1' })).resolves.toMatchObject({ id: 'a1' });
  });

  it('rechaza asignar a un usuario que no es mozo', async () => {
    prisma.turno.findUnique.mockResolvedValue({ id: 't1', cierre: null, mozoMesaTurnos: [] });
    prisma.usuario.findUnique.mockResolvedValue({ id: 'u1', rol: 'cajero' });
    await expect(service.asignar('t1', { usuarioId: 'u1', mesaId: 'm1' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza asignar una mesa ya ocupada en el turno', async () => {
    prisma.turno.findUnique.mockResolvedValue({ id: 't1', cierre: null, mozoMesaTurnos: [] });
    prisma.usuario.findUnique.mockResolvedValue({ id: 'u1', rol: 'mozo' });
    prisma.mesa.findUnique.mockResolvedValue({ id: 'm1' });
    prisma.mozoMesaTurno.findFirst.mockResolvedValue({ id: 'a0' });
    await expect(service.asignar('t1', { usuarioId: 'u1', mesaId: 'm1' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('lanza NotFound al desasignar algo inexistente', async () => {
    prisma.mozoMesaTurno.findUnique.mockResolvedValue(null);
    await expect(service.desasignar('nope')).rejects.toBeInstanceOf(NotFoundException);
  });
});
