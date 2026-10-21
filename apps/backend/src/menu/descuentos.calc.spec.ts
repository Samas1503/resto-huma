import { aplicarPromocion, calcularDescuentos, ItemCarrito, PromoCalculo } from './descuentos.calc.js';

const promo = (partial: Partial<PromoCalculo>): PromoCalculo => ({
  id: 'promo1',
  nombre: 'Promo test',
  tipo: 'porcentaje',
  valor: 10,
  productos: [],
  ...partial,
});

const item = (partial: Partial<ItemCarrito>): ItemCarrito => ({
  productoId: 'prod1',
  variedadId: null,
  cantidad: 1,
  precioUnitarioArs: 1000,
  ...partial,
});

describe('calcularDescuentos (motor puro)', () => {
  it('porcentaje sin composición aplica sobre todo el carrito', () => {
    const items = [item({ cantidad: 2 }), item({ productoId: 'prod2', precioUnitarioArs: 500 })];
    const [d] = calcularDescuentos(items, [promo({ valor: 10 })]);
    expect(d.tipo).toBe('porcentaje');
    expect(d.valor).toBe(10);
    expect(d.montoArs).toBe(250); // 10% de 2500
    expect(d.promocionId).toBe('promo1');
    expect(d.motivo).toBe('Promo test');
  });

  it('porcentaje con composición solo descuenta ítems elegibles', () => {
    const items = [
      item({ productoId: 'prod1', variedadId: 'var1', precioUnitarioArs: 1000 }),
      item({ productoId: 'prod2', precioUnitarioArs: 2000 }),
    ];
    const p = promo({ productos: [{ productoId: 'prod1', variedadId: null }] });
    const [d] = calcularDescuentos(items, [p]);
    expect(d.montoArs).toBe(100); // solo prod1
  });

  it('variedadId=null en la composición cubre todas las variedades del producto', () => {
    const items = [item({ variedadId: 'var9' }), item({ variedadId: 'var8' })];
    const p = promo({ productos: [{ productoId: 'prod1', variedadId: null }] });
    const [d] = calcularDescuentos(items, [p]);
    expect(d.montoArs).toBe(200); // 10% de 2000 → ambas variedades
  });

  it('variedadId set solo matchea esa variedad', () => {
    const items = [item({ variedadId: 'var1' }), item({ variedadId: 'var2' })];
    const p = promo({ productos: [{ productoId: 'prod1', variedadId: 'var1' }] });
    const [d] = calcularDescuentos(items, [p]);
    expect(d.montoArs).toBe(100);
  });

  it('monto_fijo se capea al subtotal elegible', () => {
    const items = [item({ precioUnitarioArs: 300 })];
    const [d] = calcularDescuentos(items, [promo({ tipo: 'monto_fijo', valor: 500 })]);
    expect(d).toMatchObject({ tipo: 'monto', valor: 300, montoArs: 300 });
  });

  it('precio_combo descuenta la diferencia vs suma de unitarios, por combo completo', () => {
    const items = [
      item({ productoId: 'prod1', cantidad: 2, precioUnitarioArs: 1000 }),
      item({ productoId: 'prod2', cantidad: 3, precioUnitarioArs: 500 }),
    ];
    const p = promo({
      tipo: 'precio_combo',
      valor: 1200, // combo = prod1 + prod2 por 1200 (lista 1500)
      productos: [
        { productoId: 'prod1', variedadId: null },
        { productoId: 'prod2', variedadId: null },
      ],
    });
    const [d] = calcularDescuentos(items, [p]);
    // combos = min(2, 3) = 2 → 2 × (1500 − 1200) = 600
    expect(d.montoArs).toBe(600);
  });

  it('precio_combo sin stock de un integrante no aplica', () => {
    const items = [item({ productoId: 'prod1' })];
    const p = promo({
      tipo: 'precio_combo',
      valor: 100,
      productos: [
        { productoId: 'prod1', variedadId: null },
        { productoId: 'prod2', variedadId: null },
      ],
    });
    expect(calcularDescuentos(items, [p])).toHaveLength(0);
  });

  it('nxm 12.10 (docena pagando 10) regala las 2 más baratas por docena', () => {
    const items = [item({ cantidad: 12, precioUnitarioArs: 500 })];
    const [d] = calcularDescuentos(items, [promo({ tipo: 'nxm', valor: 12.1 })]);
    expect(d).toMatchObject({ tipo: 'monto', montoArs: 1000 }); // 2 × 500
  });

  it('nxm 3.02 sobre mezcla de precios regala las más baratas', () => {
    const items = [
      item({ productoId: 'a', cantidad: 2, precioUnitarioArs: 800 }),
      item({ productoId: 'b', cantidad: 4, precioUnitarioArs: 400 }),
    ];
    // 6 unidades → 2 grupos de 3 → 2 gratis (las de 400)
    const [d] = calcularDescuentos(items, [promo({ tipo: 'nxm', valor: 3.02 })]);
    expect(d.montoArs).toBe(800);
  });

  it('nxm con valor mal codificado (m >= n) no aplica', () => {
    const items = [item({ cantidad: 10 })];
    const p = promo({ tipo: 'nxm', valor: 3.5 });
    expect(calcularDescuentos(items, [p])).toHaveLength(0);
  });

  it('promo sin ítems elegibles devuelve null', () => {
    const items = [item({ productoId: 'otro' })];
    const p = promo({ productos: [{ productoId: 'prod1', variedadId: null }] });
    expect(aplicarPromocion(p, items)).toBeNull();
  });
});
