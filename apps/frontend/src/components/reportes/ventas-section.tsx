'use client';

// Sección Ventas: totales + gráfico de barras por día + desglose por canal/subtipo.
// Fuente: GET /reportes/ventas (pedidos cobrados sin anulaciones).
import { useMemo } from 'react';
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
import { CANAL_LABEL, SUBTIPO_LABEL } from './labels';
import { rangoQuery, useRangoReportes } from './rango-context';
import { useReporte } from './use-reporte';
import type { VentasReporte } from './types';

const arsTick = (v: number) => (Math.abs(v) >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`);
const fechaTick = (fecha: string) => `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}`;

interface CanalFila {
  canal: string;
  subtipo: string;
  cantidadPedidos: number;
  totalArs: number;
}

export function VentasSection() {
  const { rango } = useRangoReportes();
  const { data, loading, error } = useReporte<VentasReporte>(`/reportes/ventas${rangoQuery(rango)}`);

  // Barras por día: agrega los buckets (fecha, turno, canal, subtipo) por fecha.
  const porDia = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of data?.filas ?? []) map.set(f.fecha, (map.get(f.fecha) ?? 0) + f.totalArs);
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fecha, totalArs]) => ({ fecha, totalArs }));
  }, [data]);

  // Desglose por canal/subtipo (sumando todos los días/turnos del rango).
  const porCanal = useMemo(() => {
    const map = new Map<string, CanalFila>();
    for (const f of data?.filas ?? []) {
      const key = `${f.canal}|${f.subtipo}`;
      const fila =
        map.get(key) ??
        { canal: f.canal, subtipo: f.subtipo, cantidadPedidos: 0, totalArs: 0 };
      fila.cantidadPedidos += f.cantidadPedidos;
      fila.totalArs += f.totalArs;
      map.set(key, fila);
    }
    return [...map.values()].sort((a, b) => b.totalArs - a.totalArs);
  }, [data]);

  if (loading && !data) return <ReporteLoading />;
  if (error) return <ReporteError message={error} />;
  if (!data) return null;

  const ticketPromedio = data.cantidadPedidos > 0 ? Math.round(data.totalArs / data.cantidadPedidos) : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Ventas totales</CardTitle>
            <CardDescription>Pedidos cobrados (ítems + envío)</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-zinc-900">{formatArs(data.totalArs)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pedidos cobrados</CardTitle>
            <CardDescription>Cantidad de ventas del período</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-zinc-900">{data.cantidadPedidos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ticket promedio</CardTitle>
            <CardDescription>Total por pedido cobrado</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-zinc-900">{formatArs(ticketPromedio)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ventas por día</CardTitle>
          <CardDescription>Total cobrado por día (hora argentina)</CardDescription>
        </CardHeader>
        <CardContent>
          {porDia.length === 0 ? (
            <EmptyState>Sin ventas cobradas en el período.</EmptyState>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={porDia} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                <XAxis dataKey="fecha" tickFormatter={fechaTick} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={arsTick} fontSize={12} tickLine={false} axisLine={false} width={56} />
                <Tooltip
                  formatter={(value) => [formatArs(Number(value)), 'Ventas']}
                  labelFormatter={(label) => `Fecha: ${String(label)}`}
                />
                <Bar dataKey="totalArs" fill="#27272a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Desglose por canal</CardTitle>
          <CardDescription>Ventas agrupadas por canal y subtipo de pedido</CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {porCanal.length === 0 ? (
            <EmptyState>Sin ventas cobradas en el período.</EmptyState>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Canal</TH>
                  <TH>Subtipo</TH>
                  <TH className="text-right">Pedidos</TH>
                  <TH className="text-right">Total</TH>
                </TR>
              </THead>
              <TBody>
                {porCanal.map((f) => (
                  <TR key={`${f.canal}-${f.subtipo}`}>
                    <TD>{CANAL_LABEL[f.canal as keyof typeof CANAL_LABEL] ?? f.canal}</TD>
                    <TD>{SUBTIPO_LABEL[f.subtipo as keyof typeof SUBTIPO_LABEL] ?? f.subtipo}</TD>
                    <TD className="text-right">{f.cantidadPedidos}</TD>
                    <TD className="text-right font-medium text-zinc-900">{formatArs(f.totalArs)}</TD>
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
