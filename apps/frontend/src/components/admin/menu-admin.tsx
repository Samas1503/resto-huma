'use client';

// Admin de menú (UC25): CRUD de Producto con precios duales (precioArs entero +
// precioUsd decimal), toggles disponible/activo (PATCH granular) y CRUD de
// variedades anidadas en el producto seleccionado.
import { useState } from 'react';
import type { FormEvent } from 'react';
import type { CategoriaProducto } from '@resto-huma/shared';
import { api } from '@/lib/api';
import { formatArs } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { dec, formatUsd, type ProductoApi, type VariedadApi } from './api-types';
import { EmptyState, FormError, Select, Toggle } from './fields';
import { errorMessage, useApiList } from './use-api-list';

const CATEGORIAS: { value: CategoriaProducto; label: string }[] = [
  { value: 'empanada', label: 'Empanada' },
  { value: 'plato_regional', label: 'Plato regional' },
  { value: 'bebida', label: 'Bebida' },
  { value: 'postre', label: 'Postre' },
];

const categoriaLabel = (c: CategoriaProducto) =>
  CATEGORIAS.find((x) => x.value === c)?.label ?? c;

interface ProductoDraft {
  nombre: string;
  categoria: CategoriaProducto;
  precioArs: string;
  precioUsd: string;
}

const emptyProducto: ProductoDraft = {
  nombre: '',
  categoria: 'empanada',
  precioArs: '',
  precioUsd: '',
};

interface VariedadDraft {
  nombre: string;
  precioArs: string;
  precioUsd: string;
}

const emptyVariedad: VariedadDraft = { nombre: '', precioArs: '', precioUsd: '' };

// ─── Formulario producto (alta / edición) ────────────────────
function ProductoForm({
  editing,
  onSaved,
  onCancel,
}: {
  editing: ProductoApi | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<ProductoDraft>(
    editing
      ? {
          nombre: editing.nombre,
          categoria: editing.categoria,
          precioArs: String(editing.precioArs),
          precioUsd: String(dec(editing.precioUsd)),
        }
      : emptyProducto,
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
        categoria: draft.categoria,
        precioArs: Math.round(Number(draft.precioArs)),
        precioUsd: Number(draft.precioUsd),
      };
      if (editing) await api.patch(`/menu/productos/${editing.id}`, body);
      else await api.post('/menu/productos', body);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Nombre"
          required
          maxLength={120}
          value={draft.nombre}
          onChange={(e) => setDraft({ ...draft, nombre: e.target.value })}
          placeholder="Ej.: Empanada de carne"
        />
        <Select
          label="Categoría"
          value={draft.categoria}
          onChange={(e) =>
            setDraft({ ...draft, categoria: e.target.value as CategoriaProducto })
          }
        >
          {CATEGORIAS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>
        <Input
          label="Precio ARS (entero)"
          required
          type="number"
          min={0}
          step={1}
          value={draft.precioArs}
          onChange={(e) => setDraft({ ...draft, precioArs: e.target.value })}
        />
        <Input
          label="Precio USD (2 decimales)"
          required
          type="number"
          min={0}
          step="0.01"
          value={draft.precioUsd}
          onChange={(e) => setDraft({ ...draft, precioUsd: e.target.value })}
        />
      </div>
      <FormError message={error} />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear producto'}
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

// ─── Variedades del producto seleccionado ────────────────────
function VariedadesPanel({
  producto,
  onChanged,
}: {
  producto: ProductoApi;
  onChanged: () => void;
}) {
  const [draft, setDraft] = useState<VariedadDraft>(emptyVariedad);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function editVariedad(v: VariedadApi) {
    setEditingId(v.id);
    setDraft({
      nombre: v.nombre,
      precioArs: v.precioArs === null ? '' : String(v.precioArs),
      precioUsd: v.precioUsd === null ? '' : String(dec(v.precioUsd)),
    });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = {
        nombre: draft.nombre.trim(),
        // Vacío = sin override → hereda el precio del producto (null).
        precioArs: draft.precioArs === '' ? null : Math.round(Number(draft.precioArs)),
        precioUsd: draft.precioUsd === '' ? null : Number(draft.precioUsd),
      };
      if (editingId) {
        await api.patch(`/menu/productos/${producto.id}/variedades/${editingId}`, body);
      } else {
        await api.post(`/menu/productos/${producto.id}/variedades`, {
          nombre: body.nombre,
          ...(body.precioArs !== null ? { precioArs: body.precioArs } : {}),
          ...(body.precioUsd !== null ? { precioUsd: body.precioUsd } : {}),
        });
      }
      setDraft(emptyVariedad);
      setEditingId(null);
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleDisponible(v: VariedadApi, disponible: boolean) {
    setError(null);
    try {
      await api.patch(`/menu/productos/${producto.id}/variedades/${v.id}`, { disponible });
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function remove(v: VariedadApi) {
    if (!window.confirm(`¿Eliminar la variedad "${v.nombre}"?`)) return;
    setError(null);
    try {
      await api.del(`/menu/productos/${producto.id}/variedades/${v.id}`);
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {producto.variedades.length === 0 ? (
        <EmptyState>Sin variedades. Agregá la primera abajo.</EmptyState>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Variedad</TH>
              <TH>Precio ARS</TH>
              <TH>Precio USD</TH>
              <TH>Disponible</TH>
              <TH className="text-right">Acciones</TH>
            </TR>
          </THead>
          <TBody>
            {producto.variedades.map((v) => (
              <TR key={v.id}>
                <TD className="font-medium text-zinc-900">{v.nombre}</TD>
                <TD>
                  {v.precioArs === null ? (
                    <span className="text-zinc-400">base</span>
                  ) : (
                    formatArs(v.precioArs)
                  )}
                </TD>
                <TD>
                  {v.precioUsd === null ? (
                    <span className="text-zinc-400">base</span>
                  ) : (
                    formatUsd(v.precioUsd)
                  )}
                </TD>
                <TD>
                  <Toggle
                    checked={v.disponible}
                    onChange={(d) => toggleDisponible(v, d)}
                    label={v.disponible ? 'Sí' : 'No'}
                  />
                </TD>
                <TD className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => editVariedad(v)}>
                      Editar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(v)}>
                      Eliminar
                    </Button>
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <form onSubmit={submit} className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            label={editingId ? 'Editar variedad' : 'Nueva variedad'}
            required
            maxLength={120}
            value={draft.nombre}
            onChange={(e) => setDraft({ ...draft, nombre: e.target.value })}
            placeholder="Ej.: Humita, jamón y queso"
          />
          <Input
            label="Override ARS (opcional)"
            type="number"
            min={0}
            step={1}
            value={draft.precioArs}
            onChange={(e) => setDraft({ ...draft, precioArs: e.target.value })}
            placeholder="Vacío = precio base"
          />
          <Input
            label="Override USD (opcional)"
            type="number"
            min={0}
            step="0.01"
            value={draft.precioUsd}
            onChange={(e) => setDraft({ ...draft, precioUsd: e.target.value })}
            placeholder="Vacío = precio base"
          />
        </div>
        <FormError message={error} />
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? 'Guardando…' : editingId ? 'Guardar variedad' : 'Agregar variedad'}
          </Button>
          {editingId && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditingId(null);
                setDraft(emptyVariedad);
              }}
            >
              Cancelar
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

// ─── Sección principal ───────────────────────────────────────
export function MenuAdmin() {
  const { data: productos, loading, error, reload } = useApiList<ProductoApi[]>(
    '/menu/productos',
  );
  const [editing, setEditing] = useState<ProductoApi | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const selected = productos?.find((p) => p.id === selectedId) ?? null;

  async function patchProducto(id: string, body: Record<string, unknown>) {
    setActionError(null);
    try {
      await api.patch(`/menu/productos/${id}`, body);
      reload();
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  async function remove(p: ProductoApi) {
    if (!window.confirm(`¿Eliminar el producto "${p.nombre}"? Si tiene historial se sugiere desactivarlo.`))
      return;
    setActionError(null);
    try {
      await api.del(`/menu/productos/${p.id}`);
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
          <CardTitle>{editing ? `Editar: ${editing.nombre}` : 'Nuevo producto'}</CardTitle>
          <CardDescription>
            Precios duales: ARS en enteros + USD con 2 decimales.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProductoForm
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
          <CardTitle>Productos</CardTitle>
          <CardDescription>
            Tocá una fila para gestionar sus variedades.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <FormError message={error ?? actionError} />
          {loading ? (
            <EmptyState>Cargando productos…</EmptyState>
          ) : !productos || productos.length === 0 ? (
            <EmptyState>Todavía no hay productos cargados.</EmptyState>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Producto</TH>
                  <TH>Categoría</TH>
                  <TH>Precio ARS</TH>
                  <TH>Precio USD</TH>
                  <TH>Variedades</TH>
                  <TH>Disponible</TH>
                  <TH>Activo</TH>
                  <TH className="text-right">Acciones</TH>
                </TR>
              </THead>
              <TBody>
                {productos.map((p) => (
                  <TR
                    key={p.id}
                    className={cn('cursor-pointer', selectedId === p.id && 'bg-amber-50')}
                    onClick={() => setSelectedId(selectedId === p.id ? null : p.id)}
                  >
                    <TD className="font-medium text-zinc-900">{p.nombre}</TD>
                    <TD>
                      <Badge tone="violet">{categoriaLabel(p.categoria)}</Badge>
                    </TD>
                    <TD>{formatArs(p.precioArs)}</TD>
                    <TD>{formatUsd(p.precioUsd)}</TD>
                    <TD>{p.variedades.length}</TD>
                    <TD onClick={(e) => e.stopPropagation()}>
                      <Toggle
                        checked={p.disponible}
                        onChange={(d) => patchProducto(p.id, { disponible: d })}
                      />
                    </TD>
                    <TD onClick={(e) => e.stopPropagation()}>
                      <Toggle
                        checked={p.activo}
                        onChange={(a) => patchProducto(p.id, { activo: a })}
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
            <CardTitle>Variedades de {selected.nombre}</CardTitle>
            <CardDescription>
              El precio vacío hereda el precio base del producto.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VariedadesPanel key={selected.id} producto={selected} onChanged={reload} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
