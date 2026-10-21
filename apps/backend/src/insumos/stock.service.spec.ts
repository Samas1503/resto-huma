import { NotFoundException } from '@nestjs/common';
import { InsumosStockService } from './stock.service.js';

const makeTx = (overrides: Record<string, unknown> = {}) => ({
  pedido: { findUnique: vi.fn() },
  recetaItem: { findMany: vi.fn() },
  usuario: { findFirst: vi.fn() },
  movimientoStock: { create: vi.fn(), groupBy: vi.fn().mockResolvedValue([]) },
  insumo: { update: vi.fn() },
  ...overrides,
});

const makeService = (tx: ReturnType<typeof makeTx>) => {
  const prisma = { $transaction: vi.fn((cb: (t: typeof tx) => unknown) => cb(tx)) };
  return new InsumosStockService(prisma as never);
};

describe('InsumosStockService.descontarPorPedido', () => {
  it('descuenta receta mixta (base + ajuste de variedad) multiplicando por presentación', async () => {
    const tx = makeTx();
    const service = makeService(tx);

    tx.pedido.findUnique.mockResolvedValue({
      id: 'ped1',
      mozoId: 'mozo1',
      items: [
        { productoId: 'prod1', variedadId: 'var1', cantidad: 2, presentacion: 'docena' },
        { productoId: 'prod1', variedadId: null, cantidad: 1, presentacion: 'unidad' },
      ],
      comandas: [],
    });
    tx.recetaItem.findMany.mockResolvedValue([
      { productoId: 'prod1', variedadId: null, insumoId: 'masa', cantidad: '0.05' },
      { productoId: 'prod1', variedadId: 'var1', insumoId: 'carne', cantidad: '0.10' },
    ]);

    await service.descontarPorPedido('ped1');

    // docena ×2 = 24 unidades + unidad ×1 = 25 unidades de masa (base aplica a ambos ítems)
    const movs = tx.movimientoStock.create.mock.calls.map((c) => c[0].data);
    expect(movs).toHaveLength(2);
    expect(movs.find((m) => m.insumoId === 'masa').cantidad.toString()).toBe('-1.25');
    expect(movs.find((m) => m.insumoId === 'carne').cantidad.toString()).toBe('-2.4');
    expect(movs.every((m) => m.tipo === 'descuento_pedido' && m.pedidoId === 'ped1' && m.usuarioId === 'mozo1')).toBe(true);
    expect(tx.insumo.update).toHaveBeenCalledTimes(2);
  });

  it('resuelve actor via comanda confirmada o admin cuando no hay mozo', async () => {
    const tx = makeTx();
    const service = makeService(tx);

    tx.pedido.findUnique.mockResolvedValue({
      id: 'ped2',
      mozoId: null,
      items: [{ productoId: 'p', variedadId: null, cantidad: 1, presentacion: 'unidad' }],
      comandas: [{ confirmadaPorId: 'cajero1' }],
    });
    tx.recetaItem.findMany.mockResolvedValue([
      { productoId: 'p', variedadId: null, insumoId: 'i1', cantidad: '1' },
    ]);

    await service.descontarPorPedido('ped2');
    expect(tx.movimientoStock.create.mock.calls[0][0].data.usuarioId).toBe('cajero1');
    expect(tx.usuario.findFirst).not.toHaveBeenCalled();
  });

  it('no crea movimientos si el pedido no tiene ítems con receta', async () => {
    const tx = makeTx();
    const service = makeService(tx);
    tx.pedido.findUnique.mockResolvedValue({ id: 'ped3', mozoId: null, items: [], comandas: [] });
    tx.recetaItem.findMany.mockResolvedValue([]);

    await service.descontarPorPedido('ped3');
    expect(tx.movimientoStock.create).not.toHaveBeenCalled();
  });

  it('lanza NotFoundException si el pedido no existe', async () => {
    const tx = makeTx();
    const service = makeService(tx);
    tx.pedido.findUnique.mockResolvedValue(null);
    await expect(service.descontarPorPedido('inexistente')).rejects.toThrow(NotFoundException);
  });
});
