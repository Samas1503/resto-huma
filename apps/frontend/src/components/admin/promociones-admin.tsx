'use client';

// Admin de promociones (UC28): CRUD Promocion (tipo, valor, vigencia por
// fechas, activa) + composición de productos/variedades alcanzados
// (POST/DELETE /menu/promociones/:id/productos).
import { useState } from 'react';
import type { FormEvent } from 'react';
import type { TipoPromocion } from '@resto-huma/shared';
import { api } from '@/lib/api';
import { formatArs } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { dec, type ProductoApi, type PromocionApi } from './api-types';
import { EmptyState, FormError, Select, Toggle } from './fields';
import { errorMessage, useApiList } from './use-api-list';

const TIPOS: { value: TipoPromocion; label: string }[] = [
  { value: 'porcentaje', label: 'Porcentaje' },
  { value: 'monto_fijo', label: 'Monto fijo' },
  { value: 'precio_combo', label: 'Precio combo' },
  { value: 'nxm', label: 'N×M' },
];

const tipoLabel = (t: TipoPromocion) => TIPOS.find((x) => x.value === t)?.label ?? t;

// Valor según tipo: % → "20%", montos → ARS, nxm → crudo ("12.06").
function valorLabel(promo: PromocionApi): string {
  switch (promo.tipo) {
    case 'porcentaje':
      return `${dec(promo.valor)}%`;
    case 'monto_fijo':
    case 'precio_combo':
      return formatArs(dec(promo.valor));
    case 'nxm':
      // String cruda del Decimal: conserva el formato N.MM (12.60 ≠ 12.6).
      return String(promo.valor);
  }
}

function toDateInput(iso: string | null): string {
  if (!iso) return '';
  // datetime ISO → yyyy-mm-dd para el input date.
  return iso.slice(0, 10);
}

function formatFecha(iso: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short' }).format(new Date(iso));
}

interface PromoDraft {
  nombre: string;
  tipo: TipoPromocion;
  valor: string;
  fechaInicio: string;
  fechaFin: string;
}

const emptyPromo: PromoDraft = {
  nombre: '',
  tipo: 'porcentaje',
  valor: '',
  fechaInicio: '',
  fechaFin: '',
};

// ─── Formulario promo (alta / edición) ───────────────────────
function PromoForm({
  editing,
  onSaved,
  onCancel,
}: {
  editing: PromocionApi | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<PromoDraft>(
    editing
      ? {
          nombre: editing.nombre,
          tipo: editing.tipo,
          valor: String(dec(editing.valor)),
          fechaInicio: toDateInput(editing.fechaInicio),
          fechaFin: toDateInput(editing.fechaFin),
        }
      : emptyPromo,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        nombre: draft.nombre.trim(),
        tipo: draft.tipo,
        valor: Number(draft.valor),
      };
      if (editing) {
        // UpdatePromocionDto admite null para limpiar la fecha.
        body.fechaInicio = draft.fechaInicio || null;
        body.fechaFin = draft.fechaFin || null;
        await api.patch(`/menu/promociones/${editing.id}`, body);
      } else {
        if (draft.fechaInicio) body.fechaInicio = draft.fechaInicio;
        if (draft.fechaFin) body.fechaFin = draft.fechaFin;
        await api.post('/menu/promociones', body);
      }
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Input
          label="Nombre"
          required
          maxLength={120}
          value={draft.nombre}
          onChange={(e) => setDraft({ ...draft, nombre: e.target.value })}
          placeholder="Ej.: Docena de empanadas"
        />
        <Select
          label="Tipo"
          value={draft.tipo}
          onChange={(e) => setDraft({ ...draft, tipo: e.target.value as TipoPromocion })}
        >
          {TIPOS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
        <div className="flex flex-col gap-1.5">
          <Input
            label="Valor"
            required
            type="number"
            min={0}
            step="0.01"
            value={draft.valor}
            onChange={(e) => setDraft({ ...draft, valor: e.target.value })}
          />
          {draft.tipo === 'nxm' && (
            <p className="text-xs text-zinc-400">Formato N.MM — ej.: 12.06 = llevás 12, pagás 6.</p>
          )}
        </div>
        <Input
          label="Inicio (opcional)"
          type="date"
          value={draft.fechaInicio}
          onChange={(e) => setDraft({ ...draft, fechaInicio: e.target.value })}
        />
        <Input
          label="Fin (opcional)"
          type="date"
          value={draft.fechaFin}
          onChange={(e) => setDraft({ ...draft, fechaFin: e.target.value })}
        />
      </div>
      <FormError message={error} />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear promoción'}
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

// ─── Composición de la promo (productos/variedades) ──────────
function PromoProductosPanel({
  promo,
  productos,
  onChanged,
}: {
  promo: PromocionApi;
  productos: ProductoApi[];
  onChanged: () => void;
}) {
  const [productoId, setProductoId] = useState('');
  const [variedadId, setVariedadId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const producto = productos.find((p) => p.id === productoId) ?? null;

  async function add(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post(`/menu/promociones/${promo.id}/productos`, {
        productoId,
        ...(variedadId ? { variedadId } : {}),
      });
      setProductoId('');
      setVariedadId('');
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove(promocionProductoId: string) {
    setError(null);
    try {
      await api.del(`/menu/promociones/${promo.id}/productos/${promocionProductoId}`);
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {promo.productos.length === 0 ? (
        <EmptyState>La promo no tiene productos asignados.</EmptyState>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {promo.productos.map((pp) => (
            <li
              key={pp.id}
              className="flex items-center gap-1 rounded-full bg-zinc-100 py-1 pl-3 pr-1 text-xs text-zinc-700"
            >
              <span className="font-medium">{pp.producto.nombre}</span>
              {pp.variedad && <span className="text-zinc-500">· {pp.variedad.nombre}</span>}
              <button
                type="button"
                onClick={() => remove(pp.id)}
                title="Quitar"
                className="ml-1 flex size-5 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className="flex flex-wrap items-end gap-3">
        <div className="w-56">
          <Select
            label="Producto"
            required
            value={productoId}
            onChange={(e) => {
              setProductoId(e.target.value);
              setVariedadId('');
            }}
          >
            <option value="" disabled>
              Elegí…
            </option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-56">
          <Select
            label="Variedad (opcional)"
            value={variedadId}
            onChange={(e) => setVariedadId(e.target.value)}
            disabled={!producto || producto.variedades.length === 0}
          >
            <option value="">Todas las variedades</option>
            {producto?.variedades.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nombre}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" size="sm" variant="secondary" disabled={saving || !productoId}>
          {saving ? 'Agregando…' : 'Agregar'}
        </Button>
      </form>
      <FormError message={error} />
    </div>
  );
}

// ─── Sección principal ───────────────────────────────────────
export function PromocionesAdmin() {
  const { data: promos, loading, error, reload } = useApiList<PromocionApi[]>(
    '/menu/promociones',
  );
  const productosQ = useApiList<ProductoApi[]>('/menu/productos');
  const [editing, setEditing] = useState<PromocionApi | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const selected = promos?.find((p) => p.id === selectedId) ?? null;

  async function toggleActiva(p: PromocionApi, activa: boolean) {
    setActionError(null);
    try {
      await api.patch(`/menu/promociones/${p.id}`, { activa });
      reload();
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  async function remove(p: PromocionApi) {
    if (!window.confirm(`¿Eliminar la promoción "${p.nombre}"?`)) return;
    setActionError(null);
    try {
      await api.del(`/menu/promociones/${p.id}`);
      if (editing?.id === p.id) setEditing(null);
      if (selectedId === p.id) setSelectedId(null);
      reload();
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{editing ? `Editar: ${editing.nombre}` : 'Nueva promoción'}</CardTitle>
          <CardDescription>
            Fechas vacías = promo sin vigencia (activa hasta desactivarla).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PromoForm
            key={editing?.id ?? 'new'}
            editing={editing}
            onSaved={() => {
              setEditing(null);
              reload();
            }}
            onCancel={() => setEditing(null)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Promociones</CardTitle>
          <CardDescription>Tocá una fila para asignar productos/variedades.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <FormError message={error ?? actionError} />
          {loading ? (
            <EmptyState>Cargando promociones…</EmptyState>
          ) : !promos || promos.length === 0 ? (
            <EmptyState>Todavía no hay promociones.</EmptyState>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Promoción</TH>
                  <TH>Tipo</TH>
                  <TH>Valor</TH>
                  <TH>Vigencia</TH>
                  <TH>Productos</TH>
                  <TH>Activa</TH>
                  <TH className="text-right">Acciones</TH>
                </TR>
              </THead>
              <TBody>
                {promos.map((p) => (
                  <TR
                    key={p.id}
                    className={cn('cursor-pointer', selectedId === p.id && 'bg-amber-50')}
                    onClick={() => setSelectedId(selectedId === p.id ? null : p.id)}
                  >
                    <TD className="font-medium text-zinc-900">{p.nombre}</TD>
                    <TD>
                      <Badge tone="blue">{tipoLabel(p.tipo)}</Badge>
                    </TD>
                    <TD>{valorLabel(p)}</TD>
                    <TD className="whitespace-nowrap">
                      {p.fechaInicio || p.fechaFin
                        ? `${formatFecha(p.fechaInicio)} → ${formatFecha(p.fechaFin)}`
                        : 'Siempre'}
                    </TD>
                    <TD>{p.productos.length}</TD>
                    <TD onClick={(e) => e.stopPropagation()}>
                      <Toggle
                        checked={p.activa}
                        onChange={(a) => toggleActiva(p, a)}
                        label={p.activa ? 'Sí' : 'No'}
                      />
                    </TD>
                    <TD className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>
                          Editar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(p)}>
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

      {selected && (
        <Card>
          <CardHeader>
            <CardTitle>Productos de {selected.nombre}</CardTitle>
            <CardDescription>
              La variedad vacía aplica la promo a todo el producto.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PromoProductosPanel
              key={selected.id}
              promo={selected}
              productos={productosQ.data ?? []}
              onChanged={reload}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
