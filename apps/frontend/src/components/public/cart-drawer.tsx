'use client';

// Drawer lateral del carrito: lista de ítems con stepper, total y CTA a
// /pedido (checkout). En mobile ocupa casi toda la pantalla.
import Link from 'next/link';
import { formatArs } from '@/lib/format';
import { formatUsd, PRESENTACION_LABELS } from './types';
import { useCart } from './cart';

export function CartDrawer() {
  const { items, totalArs, isOpen, closeCart, updateCantidad, removeItem } = useCart();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Tu pedido">
      <div className="absolute inset-0 bg-orange-950/40 backdrop-blur-[2px]" onClick={closeCart} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-amber-50 shadow-2xl">
        <header className="flex items-center justify-between border-b border-amber-200/70 px-5 py-4">
          <h2 className="text-lg font-bold text-orange-950">Tu pedido</h2>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Cerrar carrito"
            className="rounded-full p-1.5 text-stone-400 transition-colors hover:bg-amber-100 hover:text-stone-600"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <p className="py-10 text-center text-sm text-stone-500">
              Tu pedido está vacío. Elegí algo rico de la carta.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {items.map((item) => (
                <li
                  key={item.key}
                  className="rounded-xl bg-white p-3 ring-1 ring-inset ring-amber-200/70"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-orange-950">
                        {item.variedadNombre ?? item.nombre}
                      </p>
                      {item.variedadNombre && (
                        <p className="text-xs text-stone-500">{item.nombre}</p>
                      )}
                      <p className="mt-0.5 text-xs text-stone-500">
                        {PRESENTACION_LABELS[item.presentacion]}
                        {item.notas && ` · “${item.notas}”`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.key)}
                      className="text-xs font-medium text-red-700/80 underline-offset-2 hover:underline"
                    >
                      Quitar
                    </button>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => updateCantidad(item.key, -1)}
                        className="flex size-8 items-center justify-center rounded-full bg-amber-100 font-bold text-orange-900 transition-colors hover:bg-amber-200"
                      >
                        −
                      </button>
                      <span className="w-5 text-center text-sm font-bold text-orange-950">
                        {item.cantidad}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateCantidad(item.key, 1)}
                        className="flex size-8 items-center justify-center rounded-full bg-amber-100 font-bold text-orange-900 transition-colors hover:bg-amber-200"
                      >
                        +
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-orange-950">
                        {formatArs(item.precioArs * item.cantidad)}
                      </p>
                      {formatUsd(item.precioUsd) && (
                        <p className="text-[11px] text-stone-400">
                          {formatUsd(Number(item.precioUsd) * item.cantidad)}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <footer className="border-t border-amber-200/70 bg-amber-100/60 px-5 py-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-stone-600">Total</span>
              <span className="text-lg font-bold text-orange-950">{formatArs(totalArs)}</span>
            </div>
            <Link
              href="/pedido"
              onClick={closeCart}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-orange-800 text-sm font-bold text-amber-50 transition-colors hover:bg-orange-700"
            >
              Confirmar pedido
            </Link>
            <button
              type="button"
              onClick={closeCart}
              className="mt-2 h-10 w-full rounded-xl text-sm font-medium text-stone-600 transition-colors hover:bg-amber-100"
            >
              Seguir pidiendo
            </button>
          </footer>
        )}
      </aside>
    </div>
  );
}
