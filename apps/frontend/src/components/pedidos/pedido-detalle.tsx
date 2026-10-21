'use client';

// Detalle expandible de un pedido: comandas con sus ítems y estado, ítems aún
// sin comanda (virtual pendiente de confirmación), dirección de delivery,
// descuentos aplicados, pagos registrados (solo cajero/admin) y acciones.
import { Fragment, useEffect, useState } from 'react';
import type {
  ItemPedidoDto,
  MedioPago,
  PedidoDto,
  Rol,
} from '@resto-huma/shared';
import { api, ApiError } from '@/lib/api';
import { formatArs, formatTime } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import {
  ESTADO_COMANDA_LABEL,
  ESTADO_COMANDA_TONE,
  MEDIO_PAGO_LABEL,
  PRESENTACION_LABEL,
} from './labels';
import { PedidoAcciones } from './pedido-acciones';

// GET /carta devuelve el Producto de Prisma (sin auth). Solo se usa el árbol
// id/nombre/variedades para resolver nombres de ítems.
export interface CartaProducto {
  id: string;
  nombre: string;
  variedades: { id: string; nombre: string }[];
}

export type MenuMap = Map<string, { nombre: string; variedades: Map<string, string> }>;

export function buildMenuMap(carta: CartaProducto[]): MenuMap {
  return new Map(
    carta.map((p) => [p.id, { nombre: p.nombre, variedades: new Map(p.variedades.map((v) => [v.id, v.nombre])) }]),
  );
}

// GET /finanzas/pagos?pedidoId= incluye registradoPor + anulaciones (cobros.service).
interface PagoDetalle {
  id: string;
  montoArs: number;
  medioPago: MedioPago;
  propinaArs: number;
  referenciaExterna: string | null;
  createdAt: string;
  registradoPor: { id: string; nombre: string };
  anulaciones: { id: string; motivo: string; createdAt: string }[];
}

// DescuentoAplicado aún no forma parte del PedidoDto expuesto por la API
// (PEDIDO_INCLUDE no lo trae). Se tipa opcional para renderizarlo en cuanto
// el backend lo incluya, sin romper nada mientras tanto.
interface DescuentoAplicadoDto {
  id: string;
  tipo: 'monto' | 'porcentaje';
  valor: string;
  motivo: string | null;
  promocionId: string | null;
}

function descuentosDe(pedido: PedidoDto): DescuentoAplicadoDto[] {
  return (pedido as PedidoDto & { descuentos?: DescuentoAplicadoDto[] }).descuentos ?? [];
}

function nombreItem(item: ItemPedidoDto, menu: MenuMap): string {
  const producto = menu.get(item.productoId);
  const base = producto?.nombre ?? `Producto ${item.productoId.slice(0, 6)}…`;
  const variedad = item.variedadId ? producto?.variedades.get(item.variedadId) : undefined;
  return variedad ? `${base} · ${variedad}` : base;
}

function ItemsList({ items, menu }: { items: ItemPedidoDto[]; menu: MenuMap }) {
  return (
    <ul className="space-y-1">
      {items.map((item) => (
        <li key={item.id} className="flex items-baseline justify-between gap-3 text-sm">
          <span className="text-zinc-700">
            <span className="font-medium">{item.cantidad}×</span> {nombreItem(item, menu)}
            {item.presentacion && item.presentacion !== 'unidad' && (
              <span className="text-zinc-400"> ({PRESENTACION_LABEL[item.presentacion]})</span>
            )}
            {item.notas && <span className="block text-xs text-zinc-400">Nota: {item.notas}</span>}
          </span>
          <span className="shrink-0 tabular-nums text-zinc-500">{formatArs(item.subtotalArs)}</span>
        </li>
      ))}
    </ul>
  );
}

function PagosPedido({ pedidoId, estadoPago }: { pedidoId: string; estadoPago: string }) {
  const [pagos, setPagos] = useState<PagoDetalle[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get<PagoDetalle[]>(`/finanzas/pagos?pedidoId=${pedidoId}`)
      .then((data) => !cancelled && setPagos(data))
      .catch((err: unknown) => {
        if (cancelled) return;
        // 403 no debería ocurrir (la sección solo se monta para cajero/admin),
        // pero si pasa se muestra vacío en vez de error.
        if (err instanceof ApiError && err.status === 403) setPagos([]);
        else setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [pedidoId, estadoPago]);

  return (
    <div>
      <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">Pagos</h4>
      {pagos === null && <p className="text-xs text-zinc-400">Consultando…</p>}
      {error && <p className="text-xs text-zinc-400">No se pudieron cargar los pagos.</p>}
      {pagos?.length === 0 && <p className="text-xs text-zinc-500">Sin pagos registrados.</p>}
      {pagos && pagos.length > 0 && (
        <ul className="space-y-1">
          {pagos.map((pago) => {
            const anulado = pago.anulaciones.length > 0;
            return (
              <li key={pago.id} className="flex items-center gap-2 text-sm">
                <span className="text-zinc-700">{MEDIO_PAGO_LABEL[pago.medioPago]}</span>
                <span className="tabular-nums font-medium text-zinc-900">{formatArs(pago.montoArs)}</span>
                {pago.propinaArs > 0 && (
                  <span className="text-xs text-zinc-400">+ {formatArs(pago.propinaArs)} propina</span>
                )}
                <span className="text-xs text-zinc-400">
                  {formatTime(pago.createdAt)} · {pago.registradoPor.nombre}
                </span>
                {anulado && <Badge tone="red">Anulado</Badge>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export interface PedidoDetalleProps {
  pedido: PedidoDto;
  menu: MenuMap;
  rol: Rol;
  onChanged: () => void;
}

export function PedidoDetalle({ pedido, menu, rol, onChanged }: PedidoDetalleProps) {
  const sinComanda = pedido.items.filter((i) => i.comandaId === null);
  const itemsTotal = pedido.items.reduce((acc, i) => acc + i.subtotalArs, 0);
  const descuentos = descuentosDe(pedido);
  const puedeVerPagos = rol === 'cajero' || rol === 'admin';

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="space-y-4">
        <div>
          <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Comandas
          </h4>
          {pedido.comandas.length === 0 && (
            <p className="text-xs text-zinc-500">Todavía no se envió ninguna comanda a cocina.</p>
          )}
          <div className="space-y-3">
            {pedido.comandas.map((comanda, index) => (
              <div key={comanda.id} className="rounded-lg border border-zinc-100 bg-zinc-50/50 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-xs font-medium text-zinc-700">
                    Comanda {index + 1}
                  </span>
                  <Badge tone={ESTADO_COMANDA_TONE[comanda.estado]}>
                    {ESTADO_COMANDA_LABEL[comanda.estado]}
                  </Badge>
                  <span className="text-xs text-zinc-400">
                    {formatTime(comanda.createdAt)} · origen {comanda.origen}
                  </span>
                </div>
                {comanda.notas && <p className="mb-1 text-xs text-zinc-500">Nota: {comanda.notas}</p>}
                <ItemsList items={comanda.items} menu={menu} />
              </div>
            ))}
          </div>
          {sinComanda.length > 0 && (
            <div className="mt-3 rounded-lg border border-dashed border-zinc-200 p-3">
              <p className="mb-2 text-xs font-medium text-zinc-500">
                Ítems sin enviar a cocina (se mandan al confirmar)
              </p>
              <ItemsList items={sinComanda} menu={menu} />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Datos del pedido
          </h4>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <dt className="text-zinc-500">Creado</dt>
            <dd className="text-zinc-800">{formatTime(pedido.createdAt)}</dd>
            {pedido.confirmadoAt && (
              <>
                <dt className="text-zinc-500">Confirmado</dt>
                <dd className="text-zinc-800">{formatTime(pedido.confirmadoAt)}</dd>
              </>
            )}
            {pedido.listoAt && (
              <>
                <dt className="text-zinc-500">Listo</dt>
                <dd className="text-zinc-800">{formatTime(pedido.listoAt)}</dd>
              </>
            )}
            {pedido.entregadoAt && (
              <>
                <dt className="text-zinc-500">Entregado</dt>
                <dd className="text-zinc-800">{formatTime(pedido.entregadoAt)}</dd>
              </>
            )}
            {pedido.subtipo === 'delivery' && pedido.direccionSnapshot && (
              <>
                <dt className="text-zinc-500">Dirección</dt>
                <dd className="text-zinc-800">{pedido.direccionSnapshot}</dd>
              </>
            )}
            {pedido.clienteId && (
              <>
                <dt className="text-zinc-500">Cliente</dt>
                <dd className="text-zinc-800">{pedido.clienteId.slice(0, 8)}…</dd>
              </>
            )}
          </dl>
        </div>

        <div>
          <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Totales
          </h4>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <dt className="text-zinc-500">Ítems</dt>
            <dd className="text-zinc-800 tabular-nums">{formatArs(itemsTotal)}</dd>
            {pedido.costoEnvioArs > 0 && (
              <>
                <dt className="text-zinc-500">Envío</dt>
                <dd className="text-zinc-800 tabular-nums">{formatArs(pedido.costoEnvioArs)}</dd>
              </>
            )}
            {descuentos.map((d) => (
              <Fragment key={d.id}>
                <dt className="text-zinc-500">
                  Descuento{d.motivo ? ` · ${d.motivo}` : ''}
                </dt>
                <dd className="text-emerald-700 tabular-nums">
                  {d.tipo === 'porcentaje' ? `−${d.valor}%` : `−${formatArs(Number(d.valor))}`}
                </dd>
              </Fragment>
            ))}
            <dt className="font-medium text-zinc-900">Total estimado</dt>
            <dd className="font-semibold text-zinc-900 tabular-nums">
              {formatArs(itemsTotal + pedido.costoEnvioArs)}
            </dd>
          </dl>
        </div>

        {puedeVerPagos && <PagosPedido pedidoId={pedido.id} estadoPago={pedido.estadoPago} />}

        <div>
          <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Acciones
          </h4>
          <PedidoAcciones pedido={pedido} onChanged={onChanged} />
        </div>
      </div>
    </div>
  );
}
