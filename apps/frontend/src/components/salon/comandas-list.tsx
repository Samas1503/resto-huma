'use client';

// Ítems del pedido agrupados por comanda (cada adición genera una nueva).
// Muestra el estado de cada comanda en cocina y el total de la cuenta.
import type { ComandaDto, ItemPedidoDto, ProductoDto } from '@resto-huma/shared';
import { formatArs, formatTime } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { COMANDA_LABEL, COMANDA_TONE, PRESENTACION_LABEL, productoLabel } from './labels';

function ItemRow({ item, productos }: { item: ItemPedidoDto; productos: ProductoDto[] }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 text-sm">
      <div className="min-w-0">
        <span className="font-medium text-zinc-800">
          {item.cantidad}× {productoLabel(productos, item.productoId, item.variedadId)}
        </span>
        {item.presentacion && item.presentacion !== 'unidad' && (
          <span className="ml-1.5 text-xs text-zinc-400">
            ({PRESENTACION_LABEL[item.presentacion]})
          </span>
        )}
        {item.notas && (
          <p className="truncate text-xs italic text-zinc-400">“{item.notas}”</p>
        )}
      </div>
      <span className="shrink-0 text-xs text-zinc-500">{formatArs(item.subtotalArs)}</span>
    </div>
  );
}

export interface ComandasListProps {
  comandas: ComandaDto[];
  /** Todos los ítems del pedido (los sin comanda se listan aparte). */
  items: ItemPedidoDto[];
  productos: ProductoDto[];
}

export function ComandasList({ comandas, items, productos }: ComandasListProps) {
  const anuladas = new Set(
    comandas.filter((c) => c.estado === 'anulada').map((c) => c.id),
  );
  const total = items
    .filter((i) => !i.comandaId || !anuladas.has(i.comandaId))
    .reduce((acc, i) => acc + i.subtotalArs, 0);
  const sinComanda = items.filter((i) => !i.comandaId);

  return (
    <div className="flex flex-col gap-4">
      {comandas.map((comanda, index) => (
        <section
          key={comanda.id}
          className="rounded-xl border border-zinc-200 bg-white p-4"
        >
          <div className="flex items-center justify-between gap-2 border-b border-zinc-100 pb-2">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold text-zinc-900">
                Comanda {index + 1}
              </span>
              <span className="text-xs text-zinc-400">
                {formatTime(comanda.createdAt)}
              </span>
            </div>
            <Badge tone={COMANDA_TONE[comanda.estado]}>
              {COMANDA_LABEL[comanda.estado]}
            </Badge>
          </div>
          {comanda.notas && (
            <p className="pt-2 text-xs italic text-zinc-400">“{comanda.notas}”</p>
          )}
          <div className="divide-y divide-zinc-50">
            {comanda.items.map((item) => (
              <ItemRow key={item.id} item={item} productos={productos} />
            ))}
            {comanda.items.length === 0 && (
              <p className="py-1 text-xs text-zinc-400">Sin ítems.</p>
            )}
          </div>
        </section>
      ))}

      {sinComanda.length > 0 && (
        <section className="rounded-xl border border-dashed border-zinc-200 p-4">
          <p className="pb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Sin enviar a cocina
          </p>
          <div className="divide-y divide-zinc-50">
            {sinComanda.map((item) => (
              <ItemRow key={item.id} item={item} productos={productos} />
            ))}
          </div>
        </section>
      )}

      <div className="flex items-center justify-between rounded-xl bg-zinc-900 px-4 py-3 text-white">
        <span className="text-sm font-medium">Total de la cuenta</span>
        <span className="text-lg font-semibold">{formatArs(total)}</span>
      </div>
    </div>
  );
}
