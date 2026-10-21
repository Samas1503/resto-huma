// Tipos espejo de las respuestas de GET /reportes/* (reportes.service.ts).
// packages/shared está congelado (spec 001 §A2) y no tiene contrato de reportes:
// estos tipos se mantienen acá hasta que el contrato se incorpore a shared.
import type {
  Canal,
  EstadoCaja,
  MedioPago,
  Presentacion,
  Subtipo,
  TipoTurno,
} from '@resto-huma/shared';

export interface VentaTurnoFila {
  fecha: string; // YYYY-MM-DD (hora AR)
  turnoId: string;
  turnoTipo: TipoTurno;
  canal: Canal;
  subtipo: Subtipo;
  cantidadPedidos: number;
  itemsArs: number;
  costoEnvioArs: number;
  totalArs: number;
}

export interface VentasReporte {
  desde: string | null;
  hasta: string | null;
  cantidadPedidos: number;
  totalArs: number;
  filas: VentaTurnoFila[];
}

export interface ProductoTopItem {
  posicion: number;
  productoId: string;
  producto: string;
  variedadId: string | null;
  variedad: string | null;
  unidadesVendidas: number;
  totalArs: number;
  porPresentacion: Partial<Record<Presentacion, number>>;
}

export interface ProductosTopReporte {
  desde: string | null;
  hasta: string | null;
  limite: number;
  items: ProductoTopItem[];
}

export interface InsumoCostoFila {
  insumoId: string;
  insumo: string;
  unidadMedida: string;
  cantidadConsumida: number;
  costoUnitarioArs: number;
  costoArs: number;
}

export interface CostoMercaderiaReporte {
  desde: string | null;
  hasta: string | null;
  ventasArs: number;
  costoMercaderiaArs: number;
  margenArs: number;
  margenPct: number | null;
  detalleInsumos: InsumoCostoFila[];
}

export interface CajaReporte {
  caja: {
    id: string;
    estado: EstadoCaja;
    apertura: string;
    montoInicialArs: number;
    turno: { tipo: TipoTurno; apertura: string; cierre: string | null } | null;
    abiertaPor: { id: string; nombre: string } | null;
  } | null;
  conciliacion: {
    ingresosPorMedio: Partial<
      Record<MedioPago, { cantidad: number; montoArs: number; propinaArs: number }>
    >;
    ingresosArs: number;
    propinasArs: number;
    egresosPorCategoria: Record<string, { cantidad: number; montoArs: number }>;
    egresosArs: number;
    esperadoEfectivoArs: number;
  } | null;
  cierre: {
    ingresosEsperadosArs: number;
    egresosEsperadosArs: number;
    dineroFisicoArs: number;
    diferenciaArs: number;
    createdAt: string;
    cerradoPor: { id: string; nombre: string } | null;
  } | null;
}
