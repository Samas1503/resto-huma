'use client';

// Bandeja realtime de cocina (C3): comandas pendientes/en_preparacion vía
// Socket.io (eventos de @resto-huma/shared), con fallback de polling cada 30 s
// mientras el socket esté caído e indicador de conexión en la UI.
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  EVENTS,
  type ComandaDto,
  type ComandaEstadoEvent,
  type ComandaNuevaEvent,
  type EstadoComanda,
  type MesaDto,
  type PedidoDto,
  type PedidoEstadoEvent,
  type ProductoDto,
} from '@resto-huma/shared';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IconChevronRight } from '@/components/ui/icons';
import { beepComanda } from './beep';
import { ComandaCard } from './comanda-card';

const FLASH_MS = 4000;
const POLL_MS = 30_000;
const TICK_MS = 30_000;

const byCreatedAt = (a: ComandaDto, b: ComandaDto) =>
  new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

// Estado de conexión del socket como external store: el snapshot real se lee
// post-mount (server snapshot = desconectado).
function subscribeSocketStatus(callback: () => void): () => void {
  const socket = getSocket();
  socket.on('connect', callback);
  socket.on('disconnect', callback);
  return () => {
    socket.off('connect', callback);
    socket.off('disconnect', callback);
  };
}
const socketConnectedSnapshot = () => getSocket().connected;
const disconnectedSnapshot = () => false;

export function CocinaBoard() {
  // null = todavía no cargó la primera vez.
  const [activas, setActivas] = useState<ComandaDto[] | null>(null);
  const [anuladas, setAnuladas] = useState<ComandaDto[]>([]);
  const [pedidos, setPedidos] = useState<Record<string, PedidoDto>>({});
  const [productos, setProductos] = useState<Map<string, string>>(new Map());
  const [variedades, setVariedades] = useState<Map<string, string>>(new Map());
  const [mesas, setMesas] = useState<Map<string, number>>(new Map());
  const connected = useSyncExternalStore(
    subscribeSocketStatus,
    socketConnectedSnapshot,
    disconnectedSnapshot,
  );
  const [flash, setFlash] = useState<ReadonlySet<string>>(new Set());
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set());
  const [showAnuladas, setShowAnuladas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(0);

  const activasRef = useRef<ComandaDto[]>([]);
  const flashTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  useEffect(() => {
    activasRef.current = activas ?? [];
  }, [activas]);
  useEffect(() => () => flashTimers.current.forEach(clearTimeout), []);

  // Carga completa de la bandeja + pedidos para resolver mesa/subtipo/canal.
  const loadBandeja = useCallback(async () => {
    try {
      const [pend, prep, anul, listaPedidos] = await Promise.all([
        api.get<ComandaDto[]>('/comandas?estado=pendiente'),
        api.get<ComandaDto[]>('/comandas?estado=en_preparacion'),
        api.get<ComandaDto[]>('/comandas?estado=anulada'),
        api.get<PedidoDto[]>('/pedidos'),
      ]);
      const pedidosMap = Object.fromEntries(listaPedidos.map((p) => [p.id, p]));
      // Las comandas de pedidos cancelados quedan huérfanas en la API (el
      // backend no las anula): se filtran acá para no ensuciar la bandeja.
      setActivas(
        [...pend, ...prep].filter(
          (c) => pedidosMap[c.pedidoId]?.estadoAtencion !== 'cancelado',
        ),
      );
      setAnuladas(anul);
      setPedidos(pedidosMap);
      setError(null);
    } catch {
      setError('No se pudo actualizar la bandeja. Reintentando…');
    }
  }, []);

  const flashComanda = useCallback((id: string) => {
    setFlash((prev) => new Set(prev).add(id));
    clearTimeout(flashTimers.current.get(id));
    flashTimers.current.set(
      id,
      setTimeout(() => {
        setFlash((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        flashTimers.current.delete(id);
      }, FLASH_MS),
    );
  }, []);

  // Carga inicial + catálogos auxiliares (nombres de productos y nº de mesa).
  // La carga se difiere a microtask: los setState no pueden correr síncronos
  // dentro del effect (react-hooks/set-state-in-effect).
  useEffect(() => {
    queueMicrotask(() => void loadBandeja());
    api
      .get<ProductoDto[]>('/carta')
      .then((lista) => {
        const prods = new Map<string, string>();
        const vars = new Map<string, string>();
        for (const p of lista) {
          prods.set(p.id, p.nombre);
          for (const v of p.variedades ?? []) vars.set(v.id, v.nombre);
        }
        setProductos(prods);
        setVariedades(vars);
      })
      .catch(() => {});
    // GET /mesas es solo admin/mozo: para rol cocina devuelve 403 y las cards
    // muestran "Mesa" sin número (fallback graceful, sin romper la vista).
    api
      .get<MesaDto[]>('/mesas')
      .then((lista) => setMesas(new Map(lista.map((m) => [m.id, m.numero]))))
      .catch(() => {});
  }, [loadBandeja]);

  // Suscripción realtime al gateway Socket.io.
  useEffect(() => {
    const socket = getSocket();

    // Al (re)conectar se resincroniza la bandeja por si se perdieron eventos.
    const onConnect = () => void loadBandeja();

    const onComandaNueva = ({ comanda }: ComandaNuevaEvent) => {
      beepComanda();
      flashComanda(comanda.id);
      // prev null (todavía cargando) se trata como lista vacía; la carga
      // inicial en vuelo lo sobrescribe con el dato fresco de la API igual.
      setActivas((prev) =>
        comanda.estado !== 'anulada' && comanda.estado !== 'lista' &&
        !(prev ?? []).some((c) => c.id === comanda.id)
          ? [...(prev ?? []), comanda]
          : prev,
      );
      // La comanda llega sin datos del pedido: se resuelve mesa/subtipo aparte.
      api
        .get<PedidoDto>(`/pedidos/${comanda.pedidoId}`)
        .then((p) => setPedidos((prev) => ({ ...prev, [p.id]: p })))
        .catch(() => {});
    };

    const onComandaEstado = ({ comandaId, estado }: ComandaEstadoEvent) => {
      if (estado === 'lista') {
        setActivas((prev) => prev?.filter((c) => c.id !== comandaId) ?? prev);
      } else if (estado === 'anulada') {
        const comanda = activasRef.current.find((c) => c.id === comandaId);
        setActivas((prev) => prev?.filter((c) => c.id !== comandaId) ?? prev);
        if (comanda) {
          setAnuladas((prev) => [{ ...comanda, estado }, ...prev]);
        }
      } else {
        setActivas(
          (prev) =>
            prev?.map((c) => (c.id === comandaId ? { ...c, estado } : c)) ?? prev,
        );
      }
    };

    const onPedidoEstado = ({ pedidoId, estado }: PedidoEstadoEvent) => {
      setPedidos((prev) =>
        prev[pedidoId]
          ? { ...prev, [pedidoId]: { ...prev[pedidoId], estadoAtencion: estado } }
          : prev,
      );
      if (estado === 'cancelado') {
        setActivas(
          (prev) => prev?.filter((c) => c.pedidoId !== pedidoId) ?? prev,
        );
      }
    };

    socket.on('connect', onConnect);
    socket.on(EVENTS.comandaNueva, onComandaNueva);
    socket.on(EVENTS.comandaEstado, onComandaEstado);
    socket.on(EVENTS.pedidoEstado, onPedidoEstado);

    return () => {
      socket.off('connect', onConnect);
      socket.off(EVENTS.comandaNueva, onComandaNueva);
      socket.off(EVENTS.comandaEstado, onComandaEstado);
      socket.off(EVENTS.pedidoEstado, onPedidoEstado);
    };
  }, [loadBandeja, flashComanda]);

  // Fallback: polling cada 30 s solo mientras el socket está desconectado.
  useEffect(() => {
    const id = setInterval(() => {
      if (!getSocket().connected) void loadBandeja();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [loadBandeja]);

  // Tick para el tiempo transcurrido de cada card.
  useEffect(() => {
    const tick = () => setNow(Date.now());
    queueMicrotask(tick);
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, []);

  const cambiarEstado = useCallback(async (comandaId: string, estado: EstadoComanda) => {
    setPendingIds((prev) => new Set(prev).add(comandaId));
    try {
      const actualizada = await api.patch<ComandaDto>(`/comandas/${comandaId}/estado`, {
        estado,
      });
      // El evento comanda.estado también llega por WS; el merge por id es idempotente.
      if (estado === 'lista') {
        setActivas((prev) => prev?.filter((c) => c.id !== comandaId) ?? prev);
      } else if (estado === 'anulada') {
        setActivas((prev) => prev?.filter((c) => c.id !== comandaId) ?? prev);
        setAnuladas((prev) => [actualizada, ...prev.filter((c) => c.id !== comandaId)]);
      } else {
        setActivas(
          (prev) => prev?.map((c) => (c.id === comandaId ? actualizada : c)) ?? prev,
        );
      }
      setError(null);
    } catch {
      setError('No se pudo cambiar el estado de la comanda.');
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(comandaId);
        return next;
      });
    }
  }, []);

  const pendientes = useMemo(
    () => (activas ?? []).filter((c) => c.estado === 'pendiente').sort(byCreatedAt),
    [activas],
  );
  const enPreparacion = useMemo(
    () => (activas ?? []).filter((c) => c.estado === 'en_preparacion').sort(byCreatedAt),
    [activas],
  );

  const productoNombre = useCallback((id: string) => productos.get(id), [productos]);
  const variedadNombre = useCallback((id: string) => variedades.get(id), [variedades]);

  const renderCard = (comanda: ComandaDto) => {
    const pedido = pedidos[comanda.pedidoId];
    return (
      <ComandaCard
        key={comanda.id}
        comanda={comanda}
        pedido={pedido}
        mesaNumero={pedido?.mesaId ? mesas.get(pedido.mesaId) : undefined}
        productoNombre={productoNombre}
        variedadNombre={variedadNombre}
        now={now}
        flashing={flash.has(comanda.id)}
        busy={pendingIds.has(comanda.id)}
        onCambiarEstado={cambiarEstado}
      />
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">Cocina</h1>
          <p className="text-sm text-zinc-500">Bandeja de comandas en tiempo real.</p>
        </div>
        <Badge tone={connected ? 'green' : 'red'}>
          <span
            className={`mr-1 inline-block size-1.5 rounded-full ${
              connected ? 'bg-emerald-500' : 'bg-red-500'
            }`}
          />
          {connected ? 'Tiempo real' : 'Sin conexión · reintenta cada 30 s'}
        </Badge>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {activas === null ? (
        <p className="py-10 text-center text-sm text-zinc-400">Cargando bandeja…</p>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-2">
          <section className="flex flex-col gap-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
              Pendientes
              <Badge tone="amber">{pendientes.length}</Badge>
            </h2>
            {pendientes.length === 0 && (
              <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-400">
                Sin comandas pendientes.
              </p>
            )}
            {pendientes.map(renderCard)}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
              En preparación
              <Badge tone="blue">{enPreparacion.length}</Badge>
            </h2>
            {enPreparacion.length === 0 && (
              <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-400">
                Nada en preparación.
              </p>
            )}
            {enPreparacion.map(renderCard)}
          </section>
        </div>
      )}

      {anuladas.length > 0 && (
        <section className="flex flex-col gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-fit"
            onClick={() => setShowAnuladas((v) => !v)}
          >
            <IconChevronRight
              className={`size-4 transition-transform ${showAnuladas ? 'rotate-90' : ''}`}
            />
            Anuladas ({anuladas.length})
          </Button>
          {showAnuladas && (
            <div className="grid items-start gap-3 lg:grid-cols-2">
              {[...anuladas].sort(byCreatedAt).map(renderCard)}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
