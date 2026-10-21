'use client';

// /pedido/[id] — seguimiento del propio pedido: GET /pedidos/:id con el JWT de
// cliente (el endpoint acepta cualquier JWT válido). Estado en vivo: evento
// socket 'pedido.estado' filtrado por id + polling cada 10s como respaldo.
import Link from 'next/link';
import { Suspense, use, useCallback, useEffect, useState } from 'react';
import {
  EVENTS,
  type EstadoAtencion,
  type PedidoDto,
  type PedidoEstadoEvent,
} from '@resto-huma/shared';
import { ApiError } from '@/lib/api';
import { formatArs, formatDateTime } from '@/lib/format';
import { getSocket } from '@/lib/socket';
import { useClienteSession } from '@/components/public/cliente-session';
import { GoogleLogin } from '@/components/public/google-login';
import { PedidoTimeline } from '@/components/public/pedido-timeline';
import { publicApi } from '@/components/public/public-api';
import { ESTADO_LABELS, PRESENTACION_LABELS, type CartaProducto } from '@/components/public/types';

const POLL_MS = 10_000;

type Estado =
  | { kind: 'loading' }
  | { kind: 'ok'; pedido: PedidoDto }
  | { kind: 'auth' }
  | { kind: 'notfound' }
  | { kind: 'error' };

// `use(params)` es acceso a datos de runtime (Cache Components): va dentro de
// un boundary <Suspense> para que la ruta pueda prerenderizar el shell.
export default function SeguimientoPage({ params }: PageProps<'/pedido/[id]'>) {
  return (
    <Suspense fallback={<p className="py-12 text-center text-sm text-stone-500">Cargando tu pedido…</p>}>
      <SeguimientoInner params={params} />
    </Suspense>
  );
}

function SeguimientoInner({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { session } = useClienteSession();
  const [estado, setEstado] = useState<Estado>({ kind: 'loading' });
  const [nombres, setNombres] = useState<Map<string, string>>(new Map());

  const fetchPedido = useCallback(() => {
    publicApi
      .get<PedidoDto>(`/pedidos/${id}`)
      .then((pedido) => setEstado({ kind: 'ok', pedido }))
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 404) {
          setEstado({ kind: 'notfound' });
          return;
        }
        // En errores (401 u otros) no se pisa un estado ya cargado por polling.
        setEstado((prev) =>
          prev.kind === 'ok'
            ? prev
            : { kind: err instanceof ApiError && err.status === 401 ? 'auth' : 'error' },
        );
      });
  }, [id]);

  // Polling + socket (el evento es broadcast global: se filtra por pedidoId).
  useEffect(() => {
    fetchPedido();
    const interval = setInterval(fetchPedido, POLL_MS);
    const socket = getSocket();
    const onEstado = (e: PedidoEstadoEvent) => {
      if (e.pedidoId === id) fetchPedido();
    };
    socket.on(EVENTS.pedidoEstado, onEstado);
    return () => {
      clearInterval(interval);
      socket.off(EVENTS.pedidoEstado, onEstado);
    };
  }, [id, fetchPedido]);

  // Reintentar al loguearse (si el 401 era por falta de token de cliente).
  useEffect(() => {
    if (session && estado.kind === 'auth') fetchPedido();
  }, [session, estado.kind, fetchPedido]);

  // La carta pública sirve para mostrar nombres de producto/variedad
  // (ItemPedido solo guarda ids + snapshot de precios).
  useEffect(() => {
    publicApi
      .get<CartaProducto[]>('/carta')
      .then((productos) => {
        const map = new Map<string, string>();
        for (const p of productos) {
          map.set(p.id, p.nombre);
          for (const v of p.variedades) map.set(v.id, v.nombre);
        }
        setNombres(map);
      })
      .catch(() => {});
  }, []);

  if (estado.kind === 'auth') {
    return (
      <div className="mx-auto flex max-w-sm flex-col items-center gap-4 py-10 text-center">
        <h1 className="text-lg font-bold text-orange-950">Seguimiento del pedido</h1>
        <p className="text-sm text-stone-600">
          Para ver el estado en vivo necesitás ingresar con la misma cuenta con
          la que hiciste el pedido.
        </p>
        <GoogleLogin />
        <Link href="/carta" className="text-sm text-stone-500 underline-offset-2 hover:underline">
          Volver a la carta
        </Link>
      </div>
    );
  }

  if (estado.kind === 'notfound' || estado.kind === 'error') {
    return (
      <div className="mx-auto flex max-w-sm flex-col items-center gap-3 py-10 text-center">
        <h1 className="text-lg font-bold text-orange-950">
          {estado.kind === 'notfound' ? 'Pedido no encontrado' : 'No pudimos cargar el pedido'}
        </h1>
        <p className="text-sm text-stone-500">
          {estado.kind === 'notfound'
            ? 'Revisá el enlace o comunicate con el local.'
            : 'Intentá de nuevo en unos segundos.'}
        </p>
        <Link href="/carta" className="text-sm font-semibold text-orange-800 underline-offset-2 hover:underline">
          Volver a la carta
        </Link>
      </div>
    );
  }

  const pedido = estado.kind === 'ok' ? estado.pedido : null;
  const totalArs = pedido
    ? pedido.items.reduce((acc, i) => acc + i.subtotalArs, 0) + pedido.costoEnvioArs
    : 0;
  const terminal: EstadoAtencion[] = ['entregado', 'cancelado'];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-orange-950">Tu pedido</h1>
          {pedido && (
            <p className="text-xs text-stone-500">
              #{pedido.id.slice(0, 8)} · {formatDateTime(pedido.createdAt)} ·{' '}
              {pedido.subtipo === 'delivery' ? 'Delivery' : 'Para llevar'}
            </p>
          )}
        </div>
        {pedido && !terminal.includes(pedido.estadoAtencion) && (
          <span className="rounded-full bg-amber-400/40 px-3 py-1 text-xs font-bold text-amber-900 ring-1 ring-inset ring-amber-400/60">
            {ESTADO_LABELS[pedido.estadoAtencion]}
          </span>
        )}
      </div>

      {estado.kind === 'loading' && (
        <p className="py-12 text-center text-sm text-stone-500">Cargando tu pedido…</p>
      )}

      {pedido && (
        <>
          <section className="rounded-2xl bg-white p-4 ring-1 ring-inset ring-amber-200/70">
            <PedidoTimeline estado={pedido.estadoAtencion} subtipo={pedido.subtipo} />
          </section>

          <section className="rounded-2xl bg-white p-4 ring-1 ring-inset ring-amber-200/70">
            <h2 className="mb-3 text-sm font-bold text-orange-950">Detalle</h2>
            <ul className="flex flex-col gap-2">
              {pedido.items.map((item) => (
                <li key={item.id} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-stone-700">
                    {item.cantidad} ×{' '}
                    {(item.variedadId && nombres.get(item.variedadId)) ??
                      nombres.get(item.productoId) ??
                      'Ítem'}
                    <span className="ml-1 text-xs text-stone-400">
                      {PRESENTACION_LABELS[item.presentacion ?? 'unidad']}
                      {item.notas && ` · “${item.notas}”`}
                    </span>
                  </span>
                  <span className="font-medium text-orange-950">{formatArs(item.subtotalArs)}</span>
                </li>
              ))}
            </ul>
            {pedido.costoEnvioArs > 0 && (
              <div className="mt-2 flex justify-between border-t border-amber-100 pt-2 text-sm">
                <span className="text-stone-500">Envío</span>
                <span className="font-medium text-orange-950">{formatArs(pedido.costoEnvioArs)}</span>
              </div>
            )}
            <div className="mt-2 flex justify-between border-t border-amber-100 pt-2">
              <span className="text-sm font-semibold text-stone-600">Total</span>
              <span className="text-base font-bold text-orange-950">{formatArs(totalArs)}</span>
            </div>
            {pedido.direccionSnapshot && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-stone-600 ring-1 ring-inset ring-amber-200/60">
                Entrega en: {pedido.direccionSnapshot}
              </p>
            )}
          </section>

          <Link
            href="/carta"
            className="mx-auto text-sm font-medium text-stone-500 underline-offset-2 hover:underline"
          >
            Volver a la carta
          </Link>
        </>
      )}
    </div>
  );
}
