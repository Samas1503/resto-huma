'use client';

// Sección Costo de mercadería: ventas vs costo de insumos consumidos → margen
// bruto, con detalle por insumo. Fuente: GET /reportes/costo-mercaderia.
import { formatArs } from '@/lib/format';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { EmptyState, ReporteError, ReporteLoading } from './feedback';
import { rangoQuery, useRangoReportes } from './rango-context';
import { useReporte } from './use-reporte';
import type { CostoMercaderiaReporte } from './types';

export function CostoMercaderiaSection() {
  const { rango } = useRangoReportes();
  const { data, loading, error } = useReporte<CostoMercaderiaReporte>(
    `/reportes/costo-mercaderia${rangoQuery(rango)}`,
  );

  if (loading && !data) return <ReporteLoading />;
  if (error) return <ReporteError message={error} />;
  if (!data) return null;

  const margenPositivo = data.margenArs >= 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Ventas</CardTitle>
            <CardDescription>Ítems de pedidos cobrados</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-zinc-900">{formatArs(data.ventasArs)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Costo de mercadería</CardTitle>
            <CardDescription>Insumos consumidos por lo vendido</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-zinc-900">
              {formatArs(data.costoMercaderiaArs)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Margen bruto</CardTitle>
            <CardDescription>Ventas − costo de mercadería</CardDescription>
          </CardHeader>
          <CardContent>
            <p
              className={cn(
                'text-2xl font-semibold',
                margenPositivo ? 'text-emerald-600' : 'text-red-600',
              )}
            >
              {formatArs(data.margenArs)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Margen %</CardTitle>
            <CardDescription>Margen sobre ventas</CardDescription>
          </CardHeader>
          <CardContent>
            <p
              className={cn(
                'text-2xl font-semibold',
                margenPositivo ? 'text-emerald-600' : 'text-red-600',
              )}
            >
              {data.margenPct !== null ? `${data.margenPct.toFixed(1)}%` : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalle por insumo</CardTitle>
          <CardDescription>
            Consumo de insumos (movimientos de descuento por pedido) ordenado por costo
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {data.detalleInsumos.length === 0 ? (
            <EmptyState>Sin consumo de insumos registrado en el período.</EmptyState>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Insumo</TH>
                  <TH>Unidad</TH>
                  <TH className="text-right">Cantidad consumida</TH>
                  <TH className="text-right">Costo unitario</TH>
                  <TH className="text-right">Costo total</TH>
                </TR>
              </THead>
              <TBody>
                {data.detalleInsumos.map((fila) => (
                  <TR key={fila.insumoId}>
                    <TD className="font-medium text-zinc-900">{fila.insumo}</TD>
                    <TD>{fila.unidadMedida}</TD>
                    <TD className="text-right">{fila.cantidadConsumida}</TD>
                    <TD className="text-right">{formatArs(fila.costoUnitarioArs)}</TD>
                    <TD className="text-right font-medium text-zinc-900">{formatArs(fila.costoArs)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
