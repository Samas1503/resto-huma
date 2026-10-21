import { TipoDescuento, TipoPromocion } from '@prisma/client';

// ─── Tipos de entrada/salida del cálculo de descuentos ──────
// ItemCarrito: línea de un pedido/carrito con precio unitario ya resuelto (ARS entero)
export interface ItemCarrito {
  productoId: string;
  variedadId?: string | null;
  cantidad: number;
  precioUnitarioArs: number;
}

// Promoción ya filtrada por vigencia, con su composición
export interface PromoCalculo {
  id: string;
  nombre: string;
  tipo: TipoPromocion;
  valor: number; // Decimal ya convertido a number
  productos: { productoId: string; variedadId: string | null }[];
}

// Espejo de la entidad DescuentoAplicado (sin ids de persistencia)
// valor: % (0–100) si tipo=porcentaje; ARS si tipo=monto
// montoArs: efecto monetario computado en ARS, siempre
export interface DescuentoCalculado {
  promocionId: string | null;
  tipo: TipoDescuento;
  valor: number;
  montoArs: number;
  motivo: string;
}

// ─── Motor de cálculo (puro, sin DB) ────────────────────────

export function calcularDescuentos(
  items: ItemCarrito[],
  promos: PromoCalculo[],
): DescuentoCalculado[] {
  return promos
    .map((promo) => aplicarPromocion(promo, items))
    .filter((d): d is DescuentoCalculado => d !== null);
}

export function aplicarPromocion(
  promo: PromoCalculo,
  items: ItemCarrito[],
): DescuentoCalculado | null {
  const elegibles = items.filter((i) => matcheaPromo(promo, i));
  switch (promo.tipo) {
    case 'porcentaje':
      return descuentoPorcentaje(promo, elegibles);
    case 'monto_fijo':
      return descuentoMontoFijo(promo, elegibles);
    case 'precio_combo':
      return descuentoCombo(promo, items);
    case 'nxm':
      return descuentoNxm(promo, elegibles);
  }
}

// Un ítem califica si la promo no tiene composición (aplica a todo)
// o si matchea alguna entrada (productoId + variedadId opcional = todas las variedades)
function matcheaPromo(promo: PromoCalculo, item: ItemCarrito): boolean {
  if (promo.productos.length === 0) return true;
  return promo.productos.some(
    (p) =>
      p.productoId === item.productoId &&
      (p.variedadId === null || p.variedadId === item.variedadId),
  );
}

const subtotal = (items: ItemCarrito[]) =>
  items.reduce((acc, i) => acc + i.precioUnitarioArs * i.cantidad, 0);

// Expande ítems a precios unitarios (un elemento por unidad)
const unidades = (items: ItemCarrito[]) =>
  items.flatMap((i) => Array<number>(i.cantidad).fill(i.precioUnitarioArs));

function descuentoPorcentaje(promo: PromoCalculo, elegibles: ItemCarrito[]): DescuentoCalculado | null {
  const base = subtotal(elegibles);
  if (base <= 0 || promo.valor <= 0) return null;
  return {
    promocionId: promo.id,
    tipo: 'porcentaje' as TipoDescuento,
    valor: promo.valor,
    montoArs: Math.round((base * promo.valor) / 100),
    motivo: promo.nombre,
  };
}

function descuentoMontoFijo(promo: PromoCalculo, elegibles: ItemCarrito[]): DescuentoCalculado | null {
  const base = subtotal(elegibles);
  const monto = Math.min(Math.round(promo.valor), base);
  if (monto <= 0) return null;
  return {
    promocionId: promo.id,
    tipo: 'monto' as TipoDescuento,
    valor: monto,
    montoArs: monto,
    motivo: promo.nombre,
  };
}

// Combo: 1 unidad de CADA entrada de la composición por `valor` ARS.
// combos = min(unidades elegibles por entrada); se toma el unitario más barato por entrada.
function descuentoCombo(promo: PromoCalculo, items: ItemCarrito[]): DescuentoCalculado | null {
  if (promo.productos.length === 0) return null;
  let combos = Infinity;
  let valorLista = 0;
  for (const entrada of promo.productos) {
    const precios = unidades(items.filter((i) => matcheaEntrada(entrada, i))).sort((a, b) => a - b);
    if (precios.length === 0) return null;
    combos = Math.min(combos, precios.length);
    valorLista += precios[0];
  }
  const ahorroPorCombo = valorLista - promo.valor;
  if (ahorroPorCombo <= 0) return null;
  const monto = Math.round(combos * ahorroPorCombo);
  return {
    promocionId: promo.id,
    tipo: 'monto' as TipoDescuento,
    valor: monto,
    montoArs: monto,
    motivo: promo.nombre,
  };
}

// nxm: `valor` codifica N.MM (ej.: 12.10 = llevá 12, pagá 10).
// Por cada grupo completo de N unidades elegibles, las (N−M) más baratas son gratis.
function descuentoNxm(promo: PromoCalculo, elegibles: ItemCarrito[]): DescuentoCalculado | null {
  const n = Math.floor(promo.valor + 1e-9);
  const m = Math.round((promo.valor - n) * 100);
  if (n < 2 || m < 1 || m >= n) return null;
  const precios = unidades(elegibles).sort((a, b) => a - b);
  const gratis = Math.floor(precios.length / n) * (n - m);
  const monto = precios.slice(0, gratis).reduce((acc, p) => acc + p, 0);
  if (monto <= 0) return null;
  return {
    promocionId: promo.id,
    tipo: 'monto' as TipoDescuento,
    valor: monto,
    montoArs: monto,
    motivo: promo.nombre,
  };
}

function matcheaEntrada(
  entrada: { productoId: string; variedadId: string | null },
  item: ItemCarrito,
): boolean {
  return (
    entrada.productoId === item.productoId &&
    (entrada.variedadId === null || entrada.variedadId === item.variedadId)
  );
}
