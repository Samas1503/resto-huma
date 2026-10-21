'use client';

// Detalle de ítems de un pedido (nombre resuelto vía /carta) + total.
// Compartido por el detalle de cobro y la bandeja de pedidos virtuales.
import type { PedidoDto } from '@resto-huma/shared';
import { formatArs } from '@/lib/format';
import { totalPedidoArs } from './types';
import type { CatalogoNombres } from './use-catalogo';

const PRESENTACION_LABEL: Record<string, string> = {
  unidad: 'u.',
  media_docena: '½ doc.',
  docena: 'doc.',
};

export function PedidoItems({
  pedido,
  catalogo,
  totalOverride,
}: {
  pedido: PedidoDto;
  catalogo: CatalogoNombres;
  /** Total autoritativo del backend (tras registrar un pago); si no, se calcula. */
  totalOverride?: number;
}) {
  const total = totalOverride ?? totalPedidoArs(pedido);
  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-1">
        {pedido.items.map((item) => {
          const variedad = catalogo.variedadNombre(item.variedadId);
          return (
            <li key={item.id} className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-zinc-700">
                <span className="font-medium">{item.cantidad}×</span>{' '}
                {catalogo.productoNombre(item.productoId)}
                {variedad && <span className="text-zinc-500"> · {variedad}</span>}
                {item.presentacion && item.presentacion !== 'unidad' && (
                  <span className="text-zinc-400">
                    {' '}
                    ({PRESENTACION_LABEL[item.presentacion] ?? item.presentacion})
                  </span>
                )}
                {item.notas && <span className="block text-xs text-zinc-400">“{item.notas}”</span>}
              </span>
              <span className="shrink-0 text-zinc-600">{formatArs(item.subtotalArs)}</span>
            </li>
          );
        })}
      </ul>
      {pedido.costoEnvioArs > 0 && (
        <p className="flex justify-between text-sm text-zinc-500">
          <span>Envío</span>
          <span>{formatArs(pedido.costoEnvioArs)}</span>
        </p>
      )}
      <p className="flex justify-between border-t border-zinc-100 pt-2 text-sm font-semibold text-zinc-900">
        <span>Total</span>
        <span>{formatArs(total)}</span>
      </p>
    </div>
  );
}
