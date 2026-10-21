'use client';

// Admin de insumos (UC26/UC35): CRUD Insumo, panel de stock bajo
// (GET /insumos/stock-bajo), movimiento manual (compra/ajuste_manual vía
// POST /movimientos-stock), auditoría reciente y recetas por producto
// (GET /recetas?productoId=) con items base + ajustes por variedad.
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { TipoMovimientoStock } from '@resto-huma/shared';
import { api } from '@/lib/api';
import { formatArs, formatDateTime } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import {
  dec,
  type InsumoApi,
  type MovimientoApi,
  type ProductoApi,
  type RecetaItemApi,
} from './api-types';
import { EmptyState, FormError, Select } from './fields';
import { errorMessage, useApiList } from './use-api-list';

const TIPOS_MOVIMIENTO: { value: TipoMovimientoStock; label: string }[] = [
  { value: 'compra', label: 'Compra (entrada)' },
  { value: 'ajuste_manual', label: 'Ajuste manual (±)' },
];

const TIPO_LABEL: Record<TipoMovimientoStock, string> = {
  compra: 'Compra',
  ajuste_manual: 'Ajuste',
  descuento_pedido: 'Descuento pedido',
  reposicion_cancelacion: 'Reposición',
  anulacion: 'Anulación',
};

interface InsumoDraft {
  nombre: string;
  unidadMedida: string;
  stockMinimo: string;
  costoUnitario: string;
}

const emptyInsumo: InsumoDraft = {
  nombre: '',
  unidadMedida: '',
  stockMinimo: '0',
  costoUnitario: '0',
};

// ─── Formulario insumo (alta / edición) ──────────────────────
function InsumoForm({
  editing,
  onSaved,
  onCancel,
}: {
  editing: InsumoApi | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<InsumoDraft>(
    editing
      ? {
          nombre: editing.nombre,
          unidadMedida: editing.unidadMedida,
          stockMinimo: String(dec(editing.stockMinimo)),
          costoUnitario: String(dec(editing.costoUnitario)),
        }
      : emptyInsumo,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = {
        nombre: draft.nombre.trim(),
        unidadMedida: draft.unidadMedida.trim(),
        stockMinimo: Number(draft.stockMinimo),
        costoUnitario: Number(draft.costoUnitario),
      };
      if (editing) await api.patch(`/insumos/${editing.id}`, body);
      else await api.post('/insumos', body);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          label="Nombre"
          required
          value={draft.nombre}
          onChange={(e) => setDraft({ ...draft, nombre: e.target.value })}
          placeholder="Ej.: Harina 000"
        />
        <Input
          label="Unidad de medida"
          required
          value={draft.unidadMedida}
          onChange={(e) => setDraft({ ...draft, unidadMedida: e.target.value })}
          placeholder="kg, litro, unidad…"
        />
        <Input
          label="Stock mínimo"
          required
          type="number"
          min={0}
          step="0.01"
          value={draft.stockMinimo}
          onChange={(e) => setDraft({ ...draft, stockMinimo: e.target.value })}
        />
        <Input
          label="Costo unitario (ARS)"
          required
          type="number"
          min={0}
          step="0.01"
          value={draft.costoUnitario}
          onChange={(e) => setDraft({ ...draft, costoUnitario: e.target.value })}
        />
      </div>
      <FormError message={error} />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear insumo'}
        </Button>
        {editing && (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}

// ─── Movimiento manual de stock ──────────────────────────────
function MovimientoForm({
  insumos,
  onSaved,
}: {
  insumos: InsumoApi[];
  onSaved: () => void;
}) {
  const [insumoId, setInsumoId] = useState('');
  const [tipo, setTipo] = useState<TipoMovimientoStock>('compra');
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post('/movimientos-stock', {
        insumoId,
        tipo,
        cantidad: Number(cantidad),
        ...(motivo.trim() ? { motivo: motivo.trim() } : {}),
      });
      setInsumoId('');
      setCantidad('');
      setMotivo('');
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          label="Insumo"
          required
          value={insumoId}
          onChange={(e) => setInsumoId(e.target.value)}
        >
          <option value="" disabled>
            Elegí un insumo…
          </option>
          {insumos.map((i) => (
            <option key={i.id} value={i.id}>
              {i.nombre} ({dec(i.stockActual)} {i.unidadMedida})
            </option>
          ))}
        </Select>
        <Select
          label="Tipo"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoMovimientoStock)}
        >
          {TIPOS_MOVIMIENTO.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
        <Input
          label={tipo === 'compra' ? 'Cantidad (positiva)' : 'Cantidad (con signo)'}
          required
          type="number"
          step="0.01"
          min={tipo === 'compra' ? 0.01 : undefined}
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          placeholder={tipo === 'compra' ? 'Ej.: 25' : 'Ej.: -2 o 5'}
        />
        <Input
          label="Motivo (opcional)"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ej.: compra mayorista"
        />
      </div>
      <FormError message={error} />
      <div>
        <Button type="submit" size="sm" disabled={saving || !insumoId}>
          {saving ? 'Registrando…' : 'Registrar movimiento'}
        </Button>
      </div>
    </form>
  );
}

// ─── Recetas por producto ────────────────────────────────────
function RecetasPanel({ productos, insumos }: { productos: ProductoApi[]; insumos: InsumoApi[] }) {
  const [productoId, setProductoId] = useState('');
  const [variedadId, setVariedadId] = useState('');
  const [insumoId, setInsumoId] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const producto = productos.find((p) => p.id === productoId) ?? null;
  const { data: items, loading, error: listError, reload } = useApiList<RecetaItemApi[]>(
    productoId ? `/recetas?productoId=${productoId}` : null,
  );

  async function addItem(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post('/recetas', {
        productoId,
        ...(variedadId ? { variedadId } : {}),
        insumoId,
        cantidad: Number(cantidad),
      });
      setVariedadId('');
      setInsumoId('');
      setCantidad('');
      reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function removeItem(item: RecetaItemApi) {
    if (!window.confirm(`¿Quitar ${item.insumo.nombre} de la receta?`)) return;
    setError(null);
    try {
      await api.del(`/recetas/${item.id}`);
      reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="max-w-sm">
        <Select
          label="Producto"
          value={productoId}
          onChange={(e) => {
            setProductoId(e.target.value);
            setVariedadId('');
          }}
        >
          <option value="">Elegí un producto…</option>
          {productos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </Select>
      </div>

      {productoId && (
        <>
          {loading ? (
            <EmptyState>Cargando receta…</EmptyState>
          ) : listError ? (
            <FormError message={listError} />
          ) : !items || items.length === 0 ? (
            <EmptyState>Este producto no tiene insumos en su receta.</EmptyState>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Insumo</TH>
                  <TH>Aplica a</TH>
                  <TH>Cantidad por unidad</TH>
                  <TH className="text-right">Acciones</TH>
                </TR>
              </THead>
              <TBody>
                {items.map((item) => (
                  <TR key={item.id}>
                    <TD className="font-medium text-zinc-900">{item.insumo.nombre}</TD>
                    <TD>
                      {item.variedad ? (
                        <Badge tone="blue">{item.variedad.nombre}</Badge>
                      ) : (
                        <Badge tone="neutral">Base (todas)</Badge>
                      )}
                    </TD>
                    <TD>
                      {dec(item.cantidad)} {item.insumo.unidadMedida}
                    </TD>
                    <TD className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => removeItem(item)}>
                        Quitar
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}

          <form onSubmit={addItem} className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <Select
                label="Variedad (opcional)"
                value={variedadId}
                onChange={(e) => setVariedadId(e.target.value)}
              >
                <option value="">Base — aplica a todas</option>
                {producto?.variedades.map((v) => (
                  <option key={v.id} value={v.id}>
                    Ajuste: {v.nombre}
                  </option>
                ))}
              </Select>
              <Select
                label="Insumo"
                required
                value={insumoId}
                onChange={(e) => setInsumoId(e.target.value)}
              >
                <option value="" disabled>
                  Elegí un insumo…
                </option>
                {insumos.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nombre} ({i.unidadMedida})
                  </option>
                ))}
              </Select>
              <Input
                label="Cantidad por unidad vendida"
                required
                type="number"
                min={0}
                step="0.001"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                placeholder="Ej.: 0.08"
              />
            </div>
            <FormError message={error} />
            <div>
              <Button type="submit" size="sm" disabled={saving || !insumoId}>
                {saving ? 'Agregando…' : 'Agregar a la receta'}
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

// ─── Sección principal ───────────────────────────────────────
export function InsumosAdmin() {
  const insumosQ = useApiList<InsumoApi[]>('/insumos');
  const stockBajoQ = useApiList<InsumoApi[]>('/insumos/stock-bajo');
  const movimientosQ = useApiList<MovimientoApi[]>('/movimientos-stock');
  const productosQ = useApiList<ProductoApi[]>('/menu/productos');
  const [editing, setEditing] = useState<InsumoApi | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const insumos = insumosQ.data ?? [];
  const stockBajoIds = useMemo(
    () => new Set((stockBajoQ.data ?? []).map((i) => i.id)),
    [stockBajoQ.data],
  );

  function reloadAll() {
    insumosQ.reload();
    stockBajoQ.reload();
    movimientosQ.reload();
  }

  async function remove(i: InsumoApi) {
    if (!window.confirm(`¿Eliminar el insumo "${i.nombre}"?`)) return;
    setActionError(null);
    try {
      await api.del(`/insumos/${i.id}`);
      if (editing?.id === i.id) setEditing(null);
      reloadAll();
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {(stockBajoQ.data?.length ?? 0) > 0 && (
        <Card className="border-amber-300 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Stock bajo
              <Badge tone="amber">{stockBajoQ.data?.length}</Badge>
            </CardTitle>
            <CardDescription>
              Insumos con stock actual igual o por debajo del mínimo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <THead>
                <TR>
                  <TH>Insumo</TH>
                  <TH>Stock actual</TH>
                  <TH>Stock mínimo</TH>
                </TR>
              </THead>
              <TBody>
                {stockBajoQ.data?.map((i) => (
                  <TR key={i.id}>
                    <TD className="font-medium text-zinc-900">{i.nombre}</TD>
                    <TD>
                      <Badge tone={dec(i.stockActual) === 0 ? 'red' : 'amber'}>
                        {dec(i.stockActual)} {i.unidadMedida}
                      </Badge>
                    </TD>
                    <TD>
                      {dec(i.stockMinimo)} {i.unidadMedida}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{editing ? `Editar: ${editing.nombre}` : 'Nuevo insumo'}</CardTitle>
          <CardDescription>
            El stock inicial arranca en 0; se carga con movimientos de compra.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InsumoForm
            key={editing?.id ?? 'new'}
            editing={editing}
            onSaved={() => {
              setEditing(null);
              reloadAll();
            }}
            onCancel={() => setEditing(null)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Insumos</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <FormError message={insumosQ.error ?? actionError} />
          {insumosQ.loading ? (
            <EmptyState>Cargando insumos…</EmptyState>
          ) : insumos.length === 0 ? (
            <EmptyState>Todavía no hay insumos cargados.</EmptyState>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Insumo</TH>
                  <TH>Unidad</TH>
                  <TH>Stock actual</TH>
                  <TH>Stock mínimo</TH>
                  <TH>Costo unitario</TH>
                  <TH className="text-right">Acciones</TH>
                </TR>
              </THead>
              <TBody>
                {insumos.map((i) => (
                  <TR key={i.id}>
                    <TD className="font-medium text-zinc-900">
                      <span className="inline-flex items-center gap-2">
                        {i.nombre}
                        {stockBajoIds.has(i.id) && <Badge tone="amber">bajo</Badge>}
                      </span>
                    </TD>
                    <TD>{i.unidadMedida}</TD>
                    <TD>{dec(i.stockActual)}</TD>
                    <TD>{dec(i.stockMinimo)}</TD>
                    <TD>{formatArs(dec(i.costoUnitario))}</TD>
                    <TD className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setEditing(i)}>
                          Editar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(i)}>
                          Eliminar
                        </Button>
                      </div>
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
          <CardTitle>Movimiento manual</CardTitle>
          <CardDescription>
            Compra (entrada positiva) o ajuste manual (cantidad con signo).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MovimientoForm insumos={insumos} onSaved={reloadAll} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Últimos movimientos</CardTitle>
          <CardDescription>Auditoría de los últimos 100 movimientos de stock.</CardDescription>
        </CardHeader>
        <CardContent>
          {movimientosQ.loading ? (
            <EmptyState>Cargando movimientos…</EmptyState>
          ) : movimientosQ.error ? (
            <FormError message={movimientosQ.error} />
          ) : !movimientosQ.data || movimientosQ.data.length === 0 ? (
            <EmptyState>Sin movimientos registrados.</EmptyState>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Fecha</TH>
                  <TH>Insumo</TH>
                  <TH>Tipo</TH>
                  <TH>Cantidad</TH>
                  <TH>Motivo</TH>
                  <TH>Registrado por</TH>
                </TR>
              </THead>
              <TBody>
                {movimientosQ.data.map((m) => (
                  <TR key={m.id}>
                    <TD className="whitespace-nowrap">{formatDateTime(m.createdAt)}</TD>
                    <TD className="font-medium text-zinc-900">{m.insumo.nombre}</TD>
                    <TD>
                      <Badge tone="neutral">{TIPO_LABEL[m.tipo] ?? m.tipo}</Badge>
                    </TD>
                    <TD className={dec(m.cantidad) < 0 ? 'text-red-600' : 'text-emerald-700'}>
                      {dec(m.cantidad) > 0 ? '+' : ''}
                      {dec(m.cantidad)} {m.insumo.unidadMedida}
                    </TD>
                    <TD className="max-w-48 truncate">{m.motivo ?? '—'}</TD>
                    <TD>{m.usuario.nombre}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recetas</CardTitle>
          <CardDescription>
            Ficha técnica por producto: insumos base más ajustes por variedad.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RecetasPanel productos={productosQ.data ?? []} insumos={insumos} />
        </CardContent>
      </Card>
    </div>
  );
}
