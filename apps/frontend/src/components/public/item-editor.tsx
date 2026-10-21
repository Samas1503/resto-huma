'use client';

// Bottom-sheet para armar un ítem del pedido: presentación (empanadas),
// cantidad y notas. En mobile ocupa la parte baja de la pantalla; en desktop
// se centra como modal. El form interno va con `key` por producto/variedad:
// al cambiar de ítem se remonta y resetea sin efectos.
import { useEffect, useState } from 'react';
import type { Presentacion } from '@resto-huma/shared';
import { formatArs } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  formatUsd,
  PRESENTACION_LABELS,
  precioArsDe,
  type CartaProducto,
  type CartaVariedad,
} from './types';
import type { CartItemInput } from './cart';

const PRESENTACIONES_EMPANADA: Presentacion[] = ['docena', 'media_docena', 'unidad'];

interface ItemEditorProps {
  producto: CartaProducto | null;
  variedad?: CartaVariedad;
  onClose: () => void;
  onAdd: (item: CartItemInput) => void;
}

export function ItemEditor({ producto, variedad, onClose, onAdd }: ItemEditorProps) {
  // Cerrar con Escape.
  useEffect(() => {
    if (!producto) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [producto, onClose]);

  if (!producto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-orange-950/40 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl bg-amber-50 p-5 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <EditorForm
          key={`${producto.id}:${variedad?.id ?? ''}`}
          producto={producto}
          variedad={variedad}
          onClose={onClose}
          onAdd={onAdd}
        />
      </div>
    </div>
  );
}

interface EditorFormProps extends Omit<ItemEditorProps, 'producto'> {
  producto: CartaProducto;
}

function EditorForm({ producto, variedad, onClose, onAdd }: EditorFormProps) {
  const esEmpanada = producto.categoria === 'empanada';
  const [presentacion, setPresentacion] = useState<Presentacion>(esEmpanada ? 'docena' : 'unidad');
  const [cantidad, setCantidad] = useState(1);
  const [notas, setNotas] = useState('');

  const precioArs = precioArsDe(producto, variedad);
  const precioUsd = formatUsd(variedad?.precioUsd ?? producto.precioUsd);
  const subtotal = precioArs * cantidad;

  return (
    <>
      <div className="mb-1 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-orange-950">
            {variedad ? variedad.nombre : producto.nombre}
          </h3>
          {variedad && <p className="text-xs text-stone-500">{producto.nombre}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="rounded-full p-1.5 text-stone-400 transition-colors hover:bg-amber-100 hover:text-stone-600"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <p className="mb-4 text-sm text-stone-600">
        {formatArs(precioArs)}
        {precioUsd && <span className="ml-2 text-xs text-stone-400">{precioUsd}</span>}
      </p>

      {esEmpanada && (
        <div className="mb-4">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500">
            Presentación
          </p>
          <div className="grid grid-cols-3 gap-2">
            {PRESENTACIONES_EMPANADA.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPresentacion(p)}
                className={cn(
                  'rounded-xl px-2 py-2.5 text-xs font-semibold ring-1 ring-inset transition-colors',
                  presentacion === p
                    ? 'bg-orange-800 text-amber-50 ring-orange-800'
                    : 'bg-white text-stone-600 ring-amber-200 hover:bg-amber-100',
                )}
              >
                {PRESENTACION_LABELS[p]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Cantidad</p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCantidad((c) => Math.max(1, c - 1))}
            className="flex size-9 items-center justify-center rounded-full bg-white text-lg font-bold text-orange-900 ring-1 ring-inset ring-amber-200 transition-colors hover:bg-amber-100"
          >
            −
          </button>
          <span className="w-6 text-center text-base font-bold text-orange-950">{cantidad}</span>
          <button
            type="button"
            onClick={() => setCantidad((c) => Math.min(99, c + 1))}
            className="flex size-9 items-center justify-center rounded-full bg-white text-lg font-bold text-orange-900 ring-1 ring-inset ring-amber-200 transition-colors hover:bg-amber-100"
          >
            +
          </button>
        </div>
      </div>

      <div className="mb-5">
        <label htmlFor="item-notas" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500">
          Notas <span className="font-normal normal-case text-stone-400">(opcional)</span>
        </label>
        <input
          id="item-notas"
          type="text"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Ej.: bien cocida, sin cebolla…"
          maxLength={120}
          className="h-10 w-full rounded-xl bg-white px-3 text-sm text-orange-950 ring-1 ring-inset ring-amber-200 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-600"
        />
      </div>

      <button
        type="button"
        onClick={() =>
          onAdd({
            productoId: producto.id,
            variedadId: variedad?.id,
            nombre: producto.nombre,
            variedadNombre: variedad?.nombre,
            presentacion: esEmpanada ? presentacion : 'unidad',
            cantidad,
            notas: notas.trim() || undefined,
            precioArs,
            precioUsd: variedad?.precioUsd ?? producto.precioUsd,
          })
        }
        className="h-12 w-full rounded-xl bg-orange-800 text-sm font-bold text-amber-50 transition-colors hover:bg-orange-700"
      >
        Agregar · {formatArs(subtotal)}
      </button>
    </>
  );
}
