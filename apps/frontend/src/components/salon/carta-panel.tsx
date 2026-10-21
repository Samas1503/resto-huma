'use client';

// Toma de pedido desde la carta: productos disponibles agrupados por categoría
// a la izquierda y borrador de ítems (cantidad, presentación, notas) a la
// derecha. Al confirmar, el padre decide si es creación o adición.
import { useMemo, useRef, useState } from 'react';
import type {
  CategoriaProducto,
  ItemPedidoInput,
  Presentacion,
  ProductoDto,
  VariedadDto,
} from '@resto-huma/shared';
import { formatArs } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CATEGORIA_LABEL, PRESENTACION_LABEL } from './labels';

interface DraftItem {
  key: string;
  productoId: string;
  variedadId?: string;
  categoria: CategoriaProducto;
  label: string;
  precioUnitarioArs: number;
  cantidad: number;
  presentacion: Presentacion;
  notas: string;
}

export interface DraftPayload {
  items: ItemPedidoInput[];
  /** Nota de la comanda generada (solo aplica a adiciones). */
  notasComanda?: string;
}

const PRESENTACIONES: Presentacion[] = ['unidad', 'docena', 'media_docena'];
const SELECT_CLASS =
  'h-8 rounded-lg border border-zinc-300 bg-white px-2 text-xs text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400';

export interface CartaPanelProps {
  productos: ProductoDto[];
  submitLabel: string;
  /** Muestra el campo de nota para la comanda (adiciones). */
  showComandaNota?: boolean;
  disabled?: boolean;
  onSubmit: (payload: DraftPayload) => Promise<void>;
}

export function CartaPanel({
  productos,
  submitLabel,
  showComandaNota = false,
  disabled = false,
  onSubmit,
}: CartaPanelProps) {
  const [draft, setDraft] = useState<DraftItem[]>([]);
  const nextKey = useRef(0);
  const [notasComanda, setNotasComanda] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categorias = useMemo(
    () => [...new Set(productos.map((p) => p.categoria))] as CategoriaProducto[],
    [productos],
  );

  const total = draft.reduce((acc, i) => acc + i.precioUnitarioArs * i.cantidad, 0);

  const agregar = (producto: ProductoDto, variedad?: VariedadDto) => {
    const variedadId = variedad?.id;
    const key = `draft-${nextKey.current++}`;
    setDraft((prev) => {
      // Fusiona con la línea "limpia" del mismo producto/variedad si existe.
      const existente = prev.find(
        (i) =>
          i.productoId === producto.id &&
          i.variedadId === variedadId &&
          !i.notas &&
          i.presentacion === 'unidad',
      );
      if (existente) {
        return prev.map((i) => (i === existente ? { ...i, cantidad: i.cantidad + 1 } : i));
      }
      return [
        ...prev,
        {
          key,
          productoId: producto.id,
          variedadId,
          categoria: producto.categoria,
          label: variedad ? `${producto.nombre} · ${variedad.nombre}` : producto.nombre,
          precioUnitarioArs: variedad?.precioArs ?? producto.precioArs,
          cantidad: 1,
          presentacion: 'unidad',
          notas: '',
        },
      ];
    });
  };

  const actualizar = (key: string, patch: Partial<DraftItem>) =>
    setDraft((prev) =>
      prev
        .map((i) => (i.key === key ? { ...i, ...patch } : i))
        .filter((i) => i.cantidad > 0),
    );

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        items: draft.map((i) => ({
          productoId: i.productoId,
          variedadId: i.variedadId,
          cantidad: i.cantidad,
          presentacion: i.presentacion,
          notas: i.notas || undefined,
        })),
        notasComanda: notasComanda || undefined,
      });
      setDraft([]);
      setNotasComanda('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el pedido');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      {/* Catálogo */}
      <Card>
        <CardHeader>
          <CardTitle>Carta</CardTitle>
        </CardHeader>
        <CardContent className="flex max-h-[32rem] flex-col gap-5 overflow-y-auto">
          {productos.length === 0 && (
            <p className="text-sm text-zinc-400">Cargando carta…</p>
          )}
          {categorias.map((categoria) => (
            <section key={categoria}>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                {CATEGORIA_LABEL[categoria]}
              </h4>
              <div className="flex flex-col gap-1">
                {productos
                  .filter((p) => p.categoria === categoria)
                  .map((producto) =>
                    producto.variedades.length === 0 ? (
                      <button
                        key={producto.id}
                        onClick={() => agregar(producto)}
                        className="flex items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm text-zinc-800 hover:bg-zinc-50"
                      >
                        <span>{producto.nombre}</span>
                        <span className="text-xs text-zinc-400">
                          {formatArs(producto.precioArs)}
                        </span>
                      </button>
                    ) : (
                      <div key={producto.id} className="px-2 py-1">
                        <p className="text-sm font-medium text-zinc-800">{producto.nombre}</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {producto.variedades.map((variedad) => (
                            <button
                              key={variedad.id}
                              onClick={() => agregar(producto, variedad)}
                              className="rounded-full border border-zinc-200 px-2.5 py-1 text-xs text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50"
                            >
                              {variedad.nombre} ·{' '}
                              {formatArs(variedad.precioArs ?? producto.precioArs)}
                            </button>
                          ))}
                        </div>
                      </div>
                    ),
                  )}
              </div>
            </section>
          ))}
        </CardContent>
      </Card>

      {/* Borrador */}
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Pedido actual</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {draft.length === 0 && (
            <p className="text-sm text-zinc-400">Tocá productos de la carta para agregarlos.</p>
          )}
          {draft.map((item) => (
            <div key={item.key} className="flex flex-col gap-1.5 rounded-lg border border-zinc-100 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-zinc-800">{item.label}</span>
                <span className="text-xs text-zinc-500">
                  {formatArs(item.precioUnitarioArs * item.cantidad)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-lg border border-zinc-200">
                  <button
                    className="px-2 py-1 text-sm text-zinc-500 hover:text-zinc-900"
                    onClick={() => actualizar(item.key, { cantidad: item.cantidad - 1 })}
                    aria-label="Quitar uno"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm">{item.cantidad}</span>
                  <button
                    className="px-2 py-1 text-sm text-zinc-500 hover:text-zinc-900"
                    onClick={() => actualizar(item.key, { cantidad: item.cantidad + 1 })}
                    aria-label="Agregar uno"
                  >
                    +
                  </button>
                </div>
                {item.categoria === 'empanada' && (
                  <select
                    className={cn(SELECT_CLASS)}
                    value={item.presentacion}
                    onChange={(e) =>
                      actualizar(item.key, { presentacion: e.target.value as Presentacion })
                    }
                  >
                    {PRESENTACIONES.map((p) => (
                      <option key={p} value={p}>
                        {PRESENTACION_LABEL[p]}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  className="ml-auto text-xs text-red-500 hover:text-red-700"
                  onClick={() => actualizar(item.key, { cantidad: 0 })}
                >
                  Quitar
                </button>
              </div>
              <Input
                placeholder="Notas (sin cebolla, bien cocida…)"
                value={item.notas}
                onChange={(e) => actualizar(item.key, { notas: e.target.value })}
                className="h-8 text-xs"
              />
            </div>
          ))}

          {showComandaNota && draft.length > 0 && (
            <Input
              label="Nota de la comanda"
              placeholder="Ej.: segunda vuelta"
              value={notasComanda}
              onChange={(e) => setNotasComanda(e.target.value)}
            />
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex items-center justify-between border-t border-zinc-100 pt-3">
            <span className="text-sm font-semibold text-zinc-900">{formatArs(total)}</span>
            <Button
              size="sm"
              disabled={draft.length === 0 || submitting || disabled}
              onClick={submit}
            >
              {submitting ? 'Enviando…' : submitLabel}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
