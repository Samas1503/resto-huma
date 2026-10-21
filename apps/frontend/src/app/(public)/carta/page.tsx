'use client';

// /carta — carta pública (GET /carta): productos disponibles agrupados por
// categoría (empanadas primero) con variedades, precio ARS + USD y CTA para
// armar el ítem en el carrito.
import { useEffect, useMemo, useState } from 'react';
import { formatArs } from '@/lib/format';
import { useCart, type CartItemInput } from '@/components/public/cart';
import { ItemEditor } from '@/components/public/item-editor';
import { publicApi } from '@/components/public/public-api';
import {
  CATEGORIA_LABELS,
  CATEGORIA_ORDEN,
  formatUsd,
  precioArsDe,
  precioUsdDe,
  type CartaProducto,
  type CartaVariedad,
  type PromocionVigente,
} from '@/components/public/types';
import type { CategoriaProducto } from '@resto-huma/shared';

type FetchState =
  | { kind: 'loading' }
  | { kind: 'ok'; productos: CartaProducto[] }
  | { kind: 'error' };

interface EditorTarget {
  producto: CartaProducto;
  variedad?: CartaVariedad;
}

function PrecioDual({ ars, usd, className }: { ars: number; usd: string | number | null; className?: string }) {
  return (
    <div className={className}>
      <p className="text-sm font-bold text-orange-950">{formatArs(ars)}</p>
      {formatUsd(usd) && <p className="text-[11px] text-stone-400">{formatUsd(usd)}</p>}
    </div>
  );
}

function AddButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 shrink-0 items-center rounded-xl bg-orange-800 px-3.5 text-xs font-bold text-amber-50 transition-colors hover:bg-orange-700"
    >
      Agregar
    </button>
  );
}

function ProductoCard({ producto, onSelect }: { producto: CartaProducto; onSelect: (t: EditorTarget) => void }) {
  const variedadesDisponibles = producto.variedades.filter((v) => v.disponible);

  if (variedadesDisponibles.length === 0) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 ring-1 ring-inset ring-amber-200/70">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-orange-950">{producto.nombre}</p>
          <PrecioDual ars={producto.precioArs} usd={producto.precioUsd} className="mt-1" />
        </div>
        <AddButton onClick={() => onSelect({ producto })} />
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-inset ring-amber-200/70">
      <p className="text-sm font-semibold text-orange-950">{producto.nombre}</p>
      <ul className="mt-2 divide-y divide-amber-100">
        {variedadesDisponibles.map((v) => (
          <li key={v.id} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="text-sm text-stone-700">{v.nombre}</p>
              <PrecioDual ars={precioArsDe(producto, v)} usd={precioUsdDe(producto, v)} />
            </div>
            <AddButton onClick={() => onSelect({ producto, variedad: v })} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function CartaPage() {
  const [state, setState] = useState<FetchState>({ kind: 'loading' });
  const [promociones, setPromociones] = useState<PromocionVigente[]>([]);
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const { addItem } = useCart();

  useEffect(() => {
    let cancelled = false;
    publicApi
      .get<CartaProducto[]>('/carta')
      .then((productos) => !cancelled && setState({ kind: 'ok', productos }))
      .catch(() => !cancelled && setState({ kind: 'error' }));
    // Promos vigentes: best-effort (si falla no bloquea la carta).
    publicApi
      .get<PromocionVigente[]>('/carta/promociones')
      .then((promos) => !cancelled && setPromociones(promos))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const porCategoria = useMemo(() => {
    if (state.kind !== 'ok') return [];
    const grupos = new Map<CategoriaProducto, CartaProducto[]>();
    for (const p of state.productos) {
      const lista = grupos.get(p.categoria) ?? [];
      lista.push(p);
      grupos.set(p.categoria, lista);
    }
    // Empanadas primero; el resto sigue CATEGORIA_ORDEN y luego lo que falte.
    return [...grupos.entries()].sort(
      ([a], [b]) => CATEGORIA_ORDEN.indexOf(a) - CATEGORIA_ORDEN.indexOf(b),
    );
  }, [state]);

  const onAdd = (item: CartItemInput) => {
    addItem(item);
    setEditor(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl bg-gradient-to-br from-orange-900 to-amber-800 px-5 py-8 text-center shadow-md">
        <h1 className="text-2xl font-bold text-amber-50">La carta</h1>
        <p className="mt-1 text-sm text-amber-200/90">
          Empanadas y comida regional. Pedí para llevar o con delivery.
        </p>
      </section>

      {promociones.length > 0 && (
        <section className="flex flex-col gap-2">
          {promociones.map((promo) => (
            <div
              key={promo.id}
              className="rounded-xl bg-amber-400/30 px-4 py-2.5 text-sm font-semibold text-amber-900 ring-1 ring-inset ring-amber-400/60"
            >
              {promo.nombre}
            </div>
          ))}
        </section>
      )}

      {state.kind === 'loading' && (
        <p className="py-16 text-center text-sm text-stone-500">Cargando la carta…</p>
      )}
      {state.kind === 'error' && (
        <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-inset ring-amber-200/70">
          <p className="text-sm font-semibold text-orange-950">No pudimos cargar la carta</p>
          <p className="mt-1 text-xs text-stone-500">
            Revisá tu conexión e intentá de nuevo en unos segundos.
          </p>
        </div>
      )}
      {state.kind === 'ok' && porCategoria.length === 0 && (
        <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-inset ring-amber-200/70">
          <p className="text-sm font-semibold text-orange-950">La carta no está disponible ahora</p>
          <p className="mt-1 text-xs text-stone-500">Volvé a intentarlo más tarde.</p>
        </div>
      )}

      {porCategoria.map(([categoria, productos]) => (
        <section key={categoria}>
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-orange-950">
            {CATEGORIA_LABELS[categoria] ?? categoria}
            <span className="h-px flex-1 bg-amber-300/60" />
          </h2>
          <div className="flex flex-col gap-3">
            {productos.map((p) => (
              <ProductoCard key={p.id} producto={p} onSelect={setEditor} />
            ))}
          </div>
        </section>
      ))}

      <ItemEditor
        producto={editor?.producto ?? null}
        variedad={editor?.variedad}
        onClose={() => setEditor(null)}
        onAdd={onAdd}
      />
    </div>
  );
}
