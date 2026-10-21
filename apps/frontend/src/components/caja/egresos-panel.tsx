'use client';

// Egresos de la caja abierta: alta (POST /finanzas/egresos) + listado
// (GET /finanzas/egresos?cajaId=). Requiere caja abierta (el backend la exige).
import { useCallback, useEffect, useState } from 'react';
import { CategoriaEgreso } from '@resto-huma/shared';
import { api, ApiError } from '@/lib/api';
import { formatArs, formatDateTime } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { CATEGORIA_EGRESO_LABEL, type EgresoRow } from './types';

const CATEGORIAS = Object.keys(CategoriaEgreso) as CategoriaEgreso[];

const selectClass =
  'h-9 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-1';

export function EgresosPanel({
  cajaId,
  onMovimiento,
}: {
  /** null = sin caja abierta → formulario bloqueado. */
  cajaId: string | null;
  onMovimiento: () => void;
}) {
  const [egresos, setEgresos] = useState<EgresoRow[] | null>(null);
  const [categoria, setCategoria] = useState<CategoriaEgreso>('compra_insumos');
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const cargar = useCallback(() => {
    const qs = cajaId ? `?cajaId=${encodeURIComponent(cajaId)}` : '';
    api
      .get<EgresoRow[]>(`/finanzas/egresos${qs}`)
      .then(setEgresos)
      .catch(() => setError('No se pudieron cargar los egresos.'));
  }, [cajaId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const montoArs = Number.parseInt(monto, 10);
    if (!Number.isInteger(montoArs) || montoArs < 1) {
      setError('Ingresá un monto entero mayor a 0.');
      return;
    }
    if (!descripcion.trim()) {
      setError('La descripción es obligatoria.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.post('/finanzas/egresos', {
        categoria,
        montoArs,
        descripcion: descripcion.trim(),
      });
      setMonto('');
      setDescripcion('');
      cargar();
      onMovimiento();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo registrar el egreso.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Registrar egreso</CardTitle>
          <CardDescription>Salida de dinero de la caja abierta</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-700" htmlFor="egreso-categoria">
                Categoría
              </label>
              <select
                id="egreso-categoria"
                className={selectClass}
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as CategoriaEgreso)}
              >
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORIA_EGRESO_LABEL[c]}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Monto (ARS)"
              inputMode="numeric"
              min={1}
              step={1}
              type="number"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="Ej.: 15000"
              required
            />
            <Input
              label="Descripción"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej.: compra de harina y queso"
              required
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            {!cajaId && (
              <p className="text-xs text-amber-700">
                No hay una caja abierta: abrila en la solapa Caja para registrar egresos.
              </p>
            )}
            <Button type="submit" disabled={loading || !cajaId} className="w-fit">
              {loading ? 'Registrando…' : 'Registrar egreso'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Egresos de la caja</CardTitle>
          <CardDescription>Últimos movimientos registrados</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <THead>
              <TR>
                <TH>Fecha</TH>
                <TH>Categoría</TH>
                <TH>Descripción</TH>
                <TH>Registrado por</TH>
                <TH className="text-right">Monto</TH>
              </TR>
            </THead>
            <TBody>
              {egresos?.map((e) => (
                <TR key={e.id}>
                  <TD className="whitespace-nowrap text-zinc-500">
                    {formatDateTime(e.createdAt)}
                  </TD>
                  <TD>{CATEGORIA_EGRESO_LABEL[e.categoria]}</TD>
                  <TD>{e.descripcion}</TD>
                  <TD className="text-zinc-500">{e.usuario.nombre}</TD>
                  <TD className="text-right font-medium text-zinc-900">
                    −{formatArs(e.montoArs)}
                  </TD>
                </TR>
              ))}
              {egresos?.length === 0 && (
                <TR>
                  <TD colSpan={5} className="py-6 text-center text-zinc-400">
                    No hay egresos registrados en esta caja.
                  </TD>
                </TR>
              )}
              {egresos === null && (
                <TR>
                  <TD colSpan={5} className="py-6 text-center text-zinc-400">
                    Cargando…
                  </TD>
                </TR>
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
