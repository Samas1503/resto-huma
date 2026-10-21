'use client';

// Sección Productos top: ranking por unidades normalizadas (docena=12, media=6)
// + gráfico de barras horizontal con el top 10. Fuente: GET /reportes/productos-top.
import { useMemo } from 'react';
import type { Presentacion } from '@resto-huma/shared';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatArs } from '@/lib/format';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { EmptyState, ReporteError, ReporteLoading } from './feedback';
import { PRESENTACION_SHORT } from './labels';
import { rangoQuery, useRangoReportes } from './rango-context';
import { useReporte } from './use-reporte';
import type { ProductoTopItem, ProductosTopReporte } from './types';

// La tabla muestra el top 20; el gráfico, los primeros 10.
const LIMITE_TABLA = 20;
const LIMITE_GRAFICO = 10;

function nombreItem(item: ProductoTopItem): string {
  return item.variedad ? `${item.producto} — ${item.variedad}` : item.producto;
}

function formatPresentacion(porPresentacion: ProductoTopItem['porPresentacion']): string {
  return (Object.entries(porPresentacion) as [Presentacion, number][])
    .map(([pres, cant]) => `${cant} ${PRESENTACION_SHORT[pres] ?? pres}`)
    .join(' · ');
}

export function ProductosTopSection() {
  const { rango } = useRangoReportes();
  const qs = rangoQuery(rango);
  const { data, loading, error } = useReporte<ProductosTopReporte>(
    `/reportes/productos-top${qs}${qs ? '&' : '?'}limite=${LIMITE_TABLA}`,
  );

  const items = useMemo(() => data?.items ?? [], [data]);

  const topGrafico = useMemo(
    () =>
      items.slice(0, LIMITE_GRAFICO).map((item) => ({
        nombre: nombreItem(item),
        unidadesVendidas: item.unidadesVendidas,
      })),
    [items],
  );

  if (loading && !data) return <ReporteLoading />;
  if (error) return <ReporteError message={error} />;
  if (!data) return null;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Productos más vendidos</CardTitle>
          <CardDescription>
            Top {Math.min(LIMITE_GRAFICO, items.length)} por unidades vendidas (docena = 12, media
            docena = 6)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topGrafico.length === 0 ? (
            <EmptyState>Sin ítems vendidos en el período.</EmptyState>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(280, topGrafico.length * 40)}>
              <BarChart
                data={topGrafico}
                layout="vertical"
                margin={{ top: 8, right: 24, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e4e4e7" />
                <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="nombre"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={180}
                />
                <Tooltip formatter={(value) => [Number(value), 'Unidades']} />
                <Bar dataKey="unidadesVendidas" fill="#d97706" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ranking de productos</CardTitle>
          <CardDescription>Los {items.length} ítems más vendidos del período</CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {items.length === 0 ? (
            <EmptyState>Sin ítems vendidos en el período.</EmptyState>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH className="w-10">#</TH>
                  <TH>Producto</TH>
                  <TH>Variedad</TH>
                  <TH>Por presentación</TH>
                  <TH className="text-right">Unidades</TH>
                  <TH className="text-right">Total</TH>
                </TR>
              </THead>
              <TBody>
                {items.map((item) => (
                  <TR key={`${item.productoId}-${item.variedadId ?? 'base'}`}>
                    <TD className="font-medium text-zinc-400">{item.posicion}</TD>
                    <TD className="font-medium text-zinc-900">{item.producto}</TD>
                    <TD>{item.variedad ?? '—'}</TD>
                    <TD className="text-zinc-500">{formatPresentacion(item.porPresentacion)}</TD>
                    <TD className="text-right">{item.unidadesVendidas}</TD>
                    <TD className="text-right font-medium text-zinc-900">{formatArs(item.totalArs)}</TD>
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
