'use client';

// Bandeja de pedidos para staff (admin/cajero/mozo): tabla con filtros por
// estadoAtencion/canal/subtipo, detalle expandible y acciones de estado.
// Refresco: eventos WS del gateway (pedido.estado, comanda.*, pedido.virtual.nuevo,
// pago.confirmado) + polling de respaldo cada 15 s.
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EVENTS,
  type Canal,
  type EstadoAtencion,
  type MesaDto,
  type PedidoDto,
  type Subtipo,
} from '@resto-huma/shared';
import { api, ApiError } from '@/lib/api';
import { formatArs, formatTime } from '@/lib/format';
import { getSocket } from '@/lib/socket';
import { useRequireRol } from '@/lib/use-require-rol';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IconChevronRight } from '@/components/ui/icons';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  CANAL_LABEL,
  ESTADO_ATENCION_LABEL,
  ESTADO_ATENCION_TONE,
  ESTADO_PAGO_LABEL,
  ESTADO_PAGO_TONE,
  ESTADOS_ACTIVOS,
  SUBTIPO_LABEL,
} from './labels';
import { buildMenuMap, PedidoDetalle, type CartaProducto, type MenuMap } from './pedido-detalle';

type EstadoFiltro = EstadoAtencion | 'activos' | 'todos';

const ESTADO_FILTROS: { value: EstadoFiltro; label: string }[] = [
  { value: 'activos', label: 'Activos' },
  { value: 'pendiente', label: ESTADO_ATENCION_LABEL.pendiente },
  { value: 'confirmado', label: ESTADO_ATENCION_LABEL.confirmado },
  { value: 'en_preparacion', label: ESTADO_ATENCION_LABEL.en_preparacion },
  { value: 'listo', label: ESTADO_ATENCION_LABEL.listo },
  { value: 'en_reparto', label: ESTADO_ATENCION_LABEL.en_reparto },
  { value: 'entregado', label: ESTADO_ATENCION_LABEL.entregado },
  { value: 'cancelado', label: ESTADO_ATENCION_LABEL.cancelado },
  { value: 'todos', label: 'Todos' },
];

const COLS = 8;

function mesaClienteLabel(pedido: PedidoDto, mesas: Map<string, number>): string {
  if (pedido.subtipo === 'mesa') {
    const numero = pedido.mesaId ? mesas.get(pedido.mesaId) : undefined;
    return numero !== undefined ? `Mesa ${numero}` : 'Mesa —';
  }
  if (pedido.subtipo === 'mostrador') return 'Mostrador';
  return pedido.clienteId ? `Cliente ${pedido.clienteId.slice(0, 8)}…` : 'Cliente';
}

export function PedidosBoard() {
  const { session } = useRequireRol();
  const [pedidos, setPedidos] = useState<PedidoDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>('activos');
  const [canalFiltro, setCanalFiltro] = useState<Canal | ''>('');
  const [subtipoFiltro, setSubtipoFiltro] = useState<Subtipo | ''>('');
  const [mesas, setMesas] = useState<Map<string, number>>(new Map());
  const [menu, setMenu] = useState<MenuMap>(new Map());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const refresh = useCallback(() => {
    const params = new URLSearchParams();
    if (canalFiltro) params.set('canal', canalFiltro);
    if (subtipoFiltro) params.set('subtipo', subtipoFiltro);
    const qs = params.size ? `?${params.toString()}` : '';
    api
      .get<PedidoDto[]>(`/pedidos${qs}`)
      .then((data) => {
        setPedidos(data);
        setError(null);
        setLastUpdate(new Date());
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : 'No se pudieron cargar los pedidos');
      });
  }, [canalFiltro, subtipoFiltro]);

  // Carga inicial + recarga al cambiar filtros server-side (canal/subtipo).
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Polling de respaldo cada 15 s (cubre eventos WS perdidos).
  useEffect(() => {
    const timer = setInterval(() => void refresh(), 15_000);
    return () => clearInterval(timer);
  }, [refresh]);

  // Datos auxiliares: mesas (403 para cajero → fallback "Mesa —") y carta
  // pública para resolver nombres de producto/variedad en el detalle.
  useEffect(() => {
    api
      .get<MesaDto[]>('/mesas')
      .then((data) => setMesas(new Map(data.map((m) => [m.id, m.numero]))))
      .catch(() => {});
    api
      .get<CartaProducto[]>('/carta')
      .then((data) => setMenu(buildMenuMap(data)))
      .catch(() => {});
  }, []);

  // Realtime: cualquier evento de pedidos/comandas/pagos dispara un refetch.
  useEffect(() => {
    const socket = getSocket();
    const onEvent = () => void refresh();
    socket.on(EVENTS.pedidoEstado, onEvent);
    socket.on(EVENTS.comandaNueva, onEvent);
    socket.on(EVENTS.comandaEstado, onEvent);
    socket.on(EVENTS.pedidoVirtualNuevo, onEvent);
    socket.on(EVENTS.pagoConfirmado, onEvent);
    return () => {
      socket.off(EVENTS.pedidoEstado, onEvent);
      socket.off(EVENTS.comandaNueva, onEvent);
      socket.off(EVENTS.comandaEstado, onEvent);
      socket.off(EVENTS.pedidoVirtualNuevo, onEvent);
      socket.off(EVENTS.pagoConfirmado, onEvent);
    };
  }, [refresh]);

  const conteos = useMemo(() => {
    const counts = new Map<EstadoFiltro, number>();
    for (const pedido of pedidos ?? []) {
      counts.set(pedido.estadoAtencion, (counts.get(pedido.estadoAtencion) ?? 0) + 1);
      if (ESTADOS_ACTIVOS.includes(pedido.estadoAtencion)) {
        counts.set('activos', (counts.get('activos') ?? 0) + 1);
      }
      counts.set('todos', (counts.get('todos') ?? 0) + 1);
    }
    return counts;
  }, [pedidos]);

  const visibles = useMemo(
    () =>
      (pedidos ?? []).filter((p) =>
        estadoFiltro === 'todos'
          ? true
          : estadoFiltro === 'activos'
            ? ESTADOS_ACTIVOS.includes(p.estadoAtencion)
            : p.estadoAtencion === estadoFiltro,
      ),
    [pedidos, estadoFiltro],
  );

  const subtiposDisponibles: Subtipo[] =
    canalFiltro === 'presencial'
      ? ['mesa', 'mostrador']
      : canalFiltro === 'virtual'
        ? ['takeaway', 'delivery']
        : ['mesa', 'mostrador', 'takeaway', 'delivery'];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">Pedidos</h1>
          <p className="text-sm text-zinc-500">
            Bandeja de atención{lastUpdate ? ` · actualizado ${formatTime(lastUpdate)}` : ''}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void refresh()}>
          Actualizar
        </Button>
      </div>

      {/* Filtros por estado con conteo */}
      <div className="flex flex-wrap gap-1.5">
        {ESTADO_FILTROS.map((f) => {
          const count = conteos.get(f.value) ?? 0;
          const active = estadoFiltro === f.value;
          return (
            <button
              key={f.value}
              onClick={() => setEstadoFiltro(f.value)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition-colors',
                active
                  ? 'bg-zinc-900 text-white ring-zinc-900'
                  : 'bg-white text-zinc-600 ring-zinc-200 hover:bg-zinc-50',
              )}
            >
              {f.label}
              <span className={cn('tabular-nums', active ? 'text-zinc-300' : 'text-zinc-400')}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filtros por canal/subtipo (server-side) */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={canalFiltro}
          onChange={(e) => {
            setCanalFiltro(e.target.value as Canal | '');
            setSubtipoFiltro('');
          }}
          className="h-9 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-800"
        >
          <option value="">Todos los canales</option>
          <option value="presencial">{CANAL_LABEL.presencial}</option>
          <option value="virtual">{CANAL_LABEL.virtual}</option>
        </select>
        <select
          value={subtipoFiltro}
          onChange={(e) => setSubtipoFiltro(e.target.value as Subtipo | '')}
          className="h-9 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-800"
        >
          <option value="">Todos los subtipos</option>
          {subtiposDisponibles.map((s) => (
            <option key={s} value={s}>
              {SUBTIPO_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button className="ml-2 underline" onClick={() => void refresh()}>
            Reintentar
          </button>
        </div>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <Table>
          <THead>
            <tr>
              <TH className="w-8" />
              <TH>Hora</TH>
              <TH>Pedido</TH>
              <TH>Canal</TH>
              <TH>Mesa / Cliente</TH>
              <TH>Atención</TH>
              <TH>Pago</TH>
              <TH className="text-right">Total estimado</TH>
            </tr>
          </THead>
          <TBody>
            {pedidos === null && !error && (
              <tr>
                <TD colSpan={COLS} className="py-8 text-center text-zinc-400">
                  Cargando pedidos…
                </TD>
              </tr>
            )}
            {pedidos !== null && visibles.length === 0 && (
              <tr>
                <TD colSpan={COLS} className="py-8 text-center text-zinc-400">
                  No hay pedidos con estos filtros.
                </TD>
              </tr>
            )}
            {visibles.map((pedido) => {
              const expanded = expandedId === pedido.id;
              const total = pedido.items.reduce((acc, i) => acc + i.subtotalArs, 0) + pedido.costoEnvioArs;
              return (
                <PedidoRow
                  key={pedido.id}
                  expanded={expanded}
                  onToggle={() => setExpandedId(expanded ? null : pedido.id)}
                  detalle={
                    <PedidoDetalle
                      pedido={pedido}
                      menu={menu}
                      rol={session?.rol ?? 'mozo'}
                      onChanged={() => void refresh()}
                    />
                  }
                >
                  <TD>
                    <IconChevronRight
                      className={cn('size-4 text-zinc-400 transition-transform', expanded && 'rotate-90')}
                    />
                  </TD>
                  <TD className="whitespace-nowrap text-zinc-500">{formatTime(pedido.createdAt)}</TD>
                  <TD className="font-medium text-zinc-900">#{pedido.id.slice(-6)}</TD>
                  <TD>
                    <span className="text-zinc-700">{CANAL_LABEL[pedido.canal]}</span>
                    <span className="text-zinc-400"> · {SUBTIPO_LABEL[pedido.subtipo]}</span>
                  </TD>
                  <TD className="text-zinc-600">{mesaClienteLabel(pedido, mesas)}</TD>
                  <TD>
                    <Badge tone={ESTADO_ATENCION_TONE[pedido.estadoAtencion]}>
                      {ESTADO_ATENCION_LABEL[pedido.estadoAtencion]}
                    </Badge>
                  </TD>
                  <TD>
                    <Badge tone={ESTADO_PAGO_TONE[pedido.estadoPago]}>
                      {ESTADO_PAGO_LABEL[pedido.estadoPago]}
                    </Badge>
                  </TD>
                  <TD className="text-right font-medium tabular-nums text-zinc-900">
                    {formatArs(total)}
                  </TD>
                </PedidoRow>
              );
            })}
          </TBody>
        </Table>
      </div>
    </div>
  );
}

// Fila principal + fila de detalle expandible (colSpan total).
function PedidoRow({
  expanded,
  onToggle,
  detalle,
  children,
}: {
  expanded: boolean;
  onToggle: () => void;
  detalle: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <TR onClick={onToggle} className={cn('cursor-pointer', expanded && 'bg-zinc-50')}>
        {children}
      </TR>
      {expanded && (
        <tr>
          <TD colSpan={COLS} className="bg-zinc-50/60 px-6 py-4">
            {detalle}
          </TD>
        </tr>
      )}
    </>
  );
}
