'use client';

// Sección Caja: estado actual (conciliación en vivo) o último cierre con
// diferencia. Fuente: GET /reportes/caja (no depende del rango de fechas).
import type { CategoriaEgreso, MedioPago } from '@resto-huma/shared';
import { formatArs, formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { EmptyState, ReporteError, ReporteLoading } from './feedback';
import { CATEGORIA_EGRESO_LABEL, MEDIO_PAGO_LABEL, TURNO_LABEL } from './labels';
import { useReporte } from './use-reporte';
import type { CajaReporte } from './types';

const medioPagoLabel = (medio: string) =>
  MEDIO_PAGO_LABEL[medio as MedioPago] ?? medio;

const categoriaLabel = (categoria: string) =>
  CATEGORIA_EGRESO_LABEL[categoria as CategoriaEgreso] ?? categoria;

export function CajaSection() {
  const { data, loading, error } = useReporte<CajaReporte>('/reportes/caja');

  if (loading && !data) return <ReporteLoading />;
  if (error) return <ReporteError message={error} />;
  if (!data) return null;

  if (!data.caja) {
    return (
      <Card>
        <CardContent className="pt-5">
          <EmptyState>Todavía no hay ninguna caja registrada.</EmptyState>
        </CardContent>
      </Card>
    );
  }

  const { caja, conciliacion, cierre } = data;
  const abierta = caja.estado === 'abierta';
  const ingresos = Object.entries(conciliacion?.ingresosPorMedio ?? {});
  const egresos = Object.entries(conciliacion?.egresosPorCategoria ?? {});

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>Estado de la caja</CardTitle>
              <CardDescription>
                {abierta
                  ? 'Sesión de dinero abierta — conciliación en vivo'
                  : 'Última caja registrada (cerrada)'}
              </CardDescription>
            </div>
            <Badge tone={abierta ? 'green' : 'neutral'}>{abierta ? 'Abierta' : 'Cerrada'}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-zinc-500">Apertura</dt>
              <dd className="font-medium text-zinc-900">{formatDateTime(caja.apertura)}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Monto inicial</dt>
              <dd className="font-medium text-zinc-900">{formatArs(caja.montoInicialArs)}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Turno</dt>
              <dd className="font-medium text-zinc-900">
                {caja.turno ? (TURNO_LABEL[caja.turno.tipo] ?? caja.turno.tipo) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Abierta por</dt>
              <dd className="font-medium text-zinc-900">{caja.abiertaPor?.nombre ?? '—'}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {conciliacion && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Ingresos por medio de pago</CardTitle>
              <CardDescription>
                Total: {formatArs(conciliacion.ingresosArs)} · Propinas:{' '}
                {formatArs(conciliacion.propinasArs)}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {ingresos.length === 0 ? (
                <EmptyState>Sin cobros registrados.</EmptyState>
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH>Medio</TH>
                      <TH className="text-right">Cobros</TH>
                      <TH className="text-right">Propinas</TH>
                      <TH className="text-right">Monto</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {ingresos.map(([medio, agg]) => (
                      <TR key={medio}>
                        <TD className="font-medium text-zinc-900">{medioPagoLabel(medio)}</TD>
                        <TD className="text-right">{agg.cantidad}</TD>
                        <TD className="text-right">{formatArs(agg.propinaArs)}</TD>
                        <TD className="text-right font-medium text-zinc-900">
                          {formatArs(agg.montoArs)}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Egresos por categoría</CardTitle>
              <CardDescription>Total: {formatArs(conciliacion.egresosArs)}</CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {egresos.length === 0 ? (
                <EmptyState>Sin egresos registrados.</EmptyState>
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH>Categoría</TH>
                      <TH className="text-right">Registros</TH>
                      <TH className="text-right">Monto</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {egresos.map(([categoria, agg]) => (
                      <TR key={categoria}>
                        <TD className="font-medium text-zinc-900">{categoriaLabel(categoria)}</TD>
                        <TD className="text-right">{agg.cantidad}</TD>
                        <TD className="text-right font-medium text-zinc-900">
                          {formatArs(agg.montoArs)}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {conciliacion && abierta && (
        <Card>
          <CardHeader>
            <CardTitle>Efectivo esperado en caja</CardTitle>
            <CardDescription>Monto inicial + cobros en efectivo − egresos</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-zinc-900">
              {formatArs(conciliacion.esperadoEfectivoArs)}
            </p>
          </CardContent>
        </Card>
      )}

      {cierre && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle>Cierre de caja</CardTitle>
                <CardDescription>
                  {formatDateTime(cierre.createdAt)}
                  {cierre.cerradoPor ? ` · por ${cierre.cerradoPor.nombre}` : ''}
                </CardDescription>
              </div>
              <Badge tone={cierre.diferenciaArs === 0 ? 'green' : 'red'}>
                {cierre.diferenciaArs === 0 ? 'Sin diferencia' : 'Con diferencia'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-zinc-500">Ingresos esperados</dt>
                <dd className="font-medium text-zinc-900">
                  {formatArs(cierre.ingresosEsperadosArs)}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Egresos esperados</dt>
                <dd className="font-medium text-zinc-900">
                  {formatArs(cierre.egresosEsperadosArs)}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Dinero físico contado</dt>
                <dd className="font-medium text-zinc-900">{formatArs(cierre.dineroFisicoArs)}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Diferencia</dt>
                <dd
                  className={cn(
                    'font-medium',
                    cierre.diferenciaArs === 0 ? 'text-emerald-600' : 'text-red-600',
                  )}
                >
                  {cierre.diferenciaArs > 0 ? '+' : ''}
                  {formatArs(cierre.diferenciaArs)}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
