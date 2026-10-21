'use client';

// Bandeja del repartidor (spec 001 §C8), mobile-first para uso en teléfono.
// - "Listos para retirar": delivery con estadoAtencion=listo.
// - "En reparto": para rol repartidor, sus pedidos en_reparto (más los sin
//   asignar); admin/cajero ven todos.
// Refresco: evento WS pedido.estado + polling de respaldo cada 15s, con
// indicador de conexión del socket.
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  EVENTS,
  type CambiarEstadoAtencionDto,
  type PedidoDto,
} from '@resto-huma/shared';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useRequireRol } from '@/lib/use-require-rol';
import { cn } from '@/lib/utils';
import { PedidoCard, type NombresProducto } from './pedido-card';

const POLL_MS = 15_000;

// Espejo mínimo de GET /carta (público): solo id/nombre para resolver items.
interface CartaVariedad {
  id: string;
  nombre: string;
}
interface CartaProducto {
  id: string;
  nombre: string;
  variedades?: CartaVariedad[];
}

function ConexionBadge({ connected }: { connected: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500">
      <span
        className={cn(
          'size-2 rounded-full',
          connected ? 'bg-emerald-500' : 'bg-zinc-300',
        )}
      />
      {connected ? 'En vivo' : 'Sin conexión (polling)'}
    </span>
  );
}

function EmptyState({ children }: { children: string }) {
  return (
    <p className="rounded-xl border border-dashed border-zinc-200 bg-white/60 p-6 text-center text-sm text-zinc-400">
      {children}
    </p>
  );
}

export function BandejaReparto() {
  const { session } = useRequireRol('repartidor', 'admin', 'cajero');
  const [listos, setListos] = useState<PedidoDto[] | null>(null);
  const [enReparto, setEnReparto] = useState<PedidoDto[] | null>(null);
  const [nombres, setNombres] = useState<NombresProducto>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, boolean>>({});

  // Conexión del socket como external store (subscribe connect/disconnect).
  const subscribeSocket = useCallback((cb: () => void) => {
    const socket = getSocket();
    socket.on('connect', cb);
    socket.on('disconnect', cb);
    return () => {
      socket.off('connect', cb);
      socket.off('disconnect', cb);
    };
  }, []);
  const connected = useSyncExternalStore(
    subscribeSocket,
    () => getSocket().connected,
    () => false,
  );

  const load = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([
        api.get<PedidoDto[]>('/pedidos?subtipo=delivery&estadoAtencion=listo'),
        api.get<PedidoDto[]>('/pedidos?subtipo=delivery&estadoAtencion=en_reparto'),
      ]);
      setListos(a);
      setEnReparto(b);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los pedidos');
    }
  }, []);

  useEffect(() => {
    // Carga inicial diferida (evita setState síncrono en el cuerpo del efecto).
    queueMicrotask(() => void load());
    const socket = getSocket();
    const onEstado = () => void load();
    const onConnect = () => void load();
    socket.on(EVENTS.pedidoEstado, onEstado);
    socket.on('connect', onConnect);
    const interval = setInterval(() => void load(), POLL_MS);
    return () => {
      socket.off(EVENTS.pedidoEstado, onEstado);
      socket.off('connect', onConnect);
      clearInterval(interval);
    };
  }, [load]);

  // Nombres de producto/variedad para el resumen de ítems (carta pública).
  useEffect(() => {
    api
      .get<CartaProducto[]>('/carta')
      .then((carta) => {
        const map: NombresProducto = new Map();
        for (const p of carta) {
          map.set(p.id, p.nombre);
          for (const v of p.variedades ?? []) map.set(v.id, `${p.nombre} ${v.nombre}`);
        }
        setNombres(map);
      })
      .catch(() => {});
  }, []);

  const cambiar = useCallback(
    async (pedidoId: string, body: CambiarEstadoAtencionDto) => {
      setPending((p) => ({ ...p, [pedidoId]: true }));
      try {
        await api.patch(`/pedidos/${pedidoId}/estado`, body);
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo actualizar el pedido');
      } finally {
        setPending((p) => ({ ...p, [pedidoId]: false }));
      }
    },
    [load],
  );

  // "Propios" del repartidor; admin/cajero ven todos los en_reparto.
  // Los en_reparto sin repartidorId quedan visibles para cualquier repartidor.
  const propios = useMemo(() => {
    const all = enReparto ?? [];
    if (session?.rol !== 'repartidor') return all;
    return all.filter((p) => !p.repartidorId || p.repartidorId === session.userId);
  }, [enReparto, session]);

  const initialLoading = listos === null && enReparto === null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">Reparto</h1>
          <p className="text-sm text-zinc-500">Entregas de delivery del turno.</p>
        </div>
        <ConexionBadge connected={connected} />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {error}
        </p>
      )}
      {initialLoading && <p className="text-sm text-zinc-400">Cargando pedidos…</p>}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-zinc-700">
          En reparto{propios.length > 0 ? ` (${propios.length})` : ''}
        </h2>
        {propios.length === 0 && !initialLoading && (
          <EmptyState>No tenés entregas en curso.</EmptyState>
        )}
        {propios.map((pedido) => (
          <PedidoCard
            key={pedido.id}
            pedido={pedido}
            nombres={nombres}
            pending={pending[pedido.id] === true}
            onEntregar={(p) => void cambiar(p.id, { estado: 'entregado' })}
            onProblema={(p, motivo) =>
              void cambiar(p.id, { estado: 'cancelado', motivoCancelacion: motivo })
            }
          />
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-zinc-700">
          Listos para retirar{(listos?.length ?? 0) > 0 ? ` (${listos!.length})` : ''}
        </h2>
        {listos?.length === 0 && <EmptyState>No hay pedidos listos para reparto.</EmptyState>}
        {listos?.map((pedido) => (
          <PedidoCard
            key={pedido.id}
            pedido={pedido}
            nombres={nombres}
            pending={pending[pedido.id] === true}
            onTomar={(p) => void cambiar(p.id, { estado: 'en_reparto' })}
          />
        ))}
      </section>
    </div>
  );
}
