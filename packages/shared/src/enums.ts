// Enums de dominio — espejo de prisma/schema.prisma (fuente: MODELO.MD)
export const Rol = { admin: 'admin', mozo: 'mozo', cocina: 'cocina', cajero: 'cajero', repartidor: 'repartidor' } as const;
export type Rol = keyof typeof Rol;

export const EstadoMesa = { libre: 'libre', ocupada: 'ocupada', cuenta_pedida: 'cuenta_pedida' } as const;
export type EstadoMesa = keyof typeof EstadoMesa;

export const EstadoReserva = { pendiente: 'pendiente', confirmada: 'confirmada', cancelada: 'cancelada', cumplida: 'cumplida', no_show: 'no_show' } as const;
export type EstadoReserva = keyof typeof EstadoReserva;

export const TipoTurno = { almuerzo: 'almuerzo', cena: 'cena' } as const;
export type TipoTurno = keyof typeof TipoTurno;

export const CategoriaProducto = { empanada: 'empanada', plato_regional: 'plato_regional', bebida: 'bebida', postre: 'postre' } as const;
export type CategoriaProducto = keyof typeof CategoriaProducto;

export const TipoPromocion = { porcentaje: 'porcentaje', monto_fijo: 'monto_fijo', precio_combo: 'precio_combo', nxm: 'nxm' } as const;
export type TipoPromocion = keyof typeof TipoPromocion;

export const TipoMovimientoStock = { descuento_pedido: 'descuento_pedido', reposicion_cancelacion: 'reposicion_cancelacion', compra: 'compra', ajuste_manual: 'ajuste_manual', anulacion: 'anulacion' } as const;
export type TipoMovimientoStock = keyof typeof TipoMovimientoStock;

export const Canal = { presencial: 'presencial', virtual: 'virtual' } as const;
export type Canal = keyof typeof Canal;

export const Subtipo = { mesa: 'mesa', mostrador: 'mostrador', takeaway: 'takeaway', delivery: 'delivery' } as const;
export type Subtipo = keyof typeof Subtipo;

export const EstadoAtencion = { pendiente: 'pendiente', confirmado: 'confirmado', en_preparacion: 'en_preparacion', listo: 'listo', en_reparto: 'en_reparto', entregado: 'entregado', cancelado: 'cancelado' } as const;
export type EstadoAtencion = keyof typeof EstadoAtencion;

export const EstadoPago = { pendiente_de_cobro: 'pendiente_de_cobro', cobrado: 'cobrado' } as const;
export type EstadoPago = keyof typeof EstadoPago;

export const Presentacion = { unidad: 'unidad', docena: 'docena', media_docena: 'media_docena' } as const;
export type Presentacion = keyof typeof Presentacion;

export const OrigenComanda = { mozo: 'mozo', sistema: 'sistema' } as const;
export type OrigenComanda = keyof typeof OrigenComanda;

export const EstadoComanda = { pendiente: 'pendiente', en_preparacion: 'en_preparacion', lista: 'lista', anulada: 'anulada' } as const;
export type EstadoComanda = keyof typeof EstadoComanda;

export const TipoDescuento = { monto: 'monto', porcentaje: 'porcentaje' } as const;
export type TipoDescuento = keyof typeof TipoDescuento;

export const MedioPago = { efectivo: 'efectivo', debito: 'debito', credito: 'credito', transferencia: 'transferencia', billetera_virtual: 'billetera_virtual' } as const;
export type MedioPago = keyof typeof MedioPago;

export const EstadoCaja = { abierta: 'abierta', cerrada: 'cerrada' } as const;
export type EstadoCaja = keyof typeof EstadoCaja;

export const CategoriaEgreso = { compra_insumos: 'compra_insumos', sueldos: 'sueldos', servicios: 'servicios', alquiler: 'alquiler', otros: 'otros' } as const;
export type CategoriaEgreso = keyof typeof CategoriaEgreso;
