'use client';

// Bandeja de pedidos virtuales pendientes de confirmación (GET /pedidos/bandeja).
// Confirmar → PATCH /pedidos/:id/estado {estado:'confirmado'} (genera comanda +
// descuenta stock en backend). Cancelar → mismo endpoint con motivoCancelacion.
// Refresco en vivo por el evento WS `pedido.virtual.nuevo` y `pedido.estado`.
import { useCallback, useEffect, useState } from 'react';
import {
  EVENTS,
  type PedidoDto,
  type PedidoEstadoEvent,
  type PedidoVirtualNuevoEvent,
} from '@resto-huma/shared';
import { api, ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { getSocket } from '@/lib/socket';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PedidoItems } from './pedido-items';
import { SUBTIPO_LABEL, shortId } from './types';
import { useCatalogo } from './use-catalogo';

function PedidoVirtualCard({
  pedido,
  onResuelto,
}: {
  pedido: PedidoDto;
  onResuelto: (pedidoId: string) => void;
}) {
  const catalogo = useCatalogo();
  const [cancelando, setCancelando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const cambiarEstado = async (estado: 'confirmado' | 'cancelado') => {
    if (estado === 'cancelado' && !motivo.trim()) {
      setError('Indicá el motivo de la cancelación.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.patch(`/pedidos/${pedido.id}/estado`, {
        estado,
        ...(estado === 'cancelado' ? { motivoCancelacion: motivo.trim() } : {}),
      });
      onResuelto(pedido.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo actualizar el pedido.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          Pedido {shortId(pedido.id)}
          <Badge tone="blue">{SUBTIPO_LABEL[pedido.subtipo]}</Badge>
          <span className="text-xs font-normal text-zinc-400">
            {formatDateTime(pedido.createdAt)}
          </span>
        </CardTitle>
        {pedido.direccionSnapshot && (
          <CardDescription>Entrega: {pedido.direccionSnapshot}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <PedidoItems pedido={pedido} catalogo={catalogo} />
        {error && <p className="text-xs text-red-600">{error}</p>}
        {cancelando ? (
          <div className="flex flex-col gap-2">
            <Input
              label="Motivo de cancelación"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej.: sin stock del producto"
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                variant="danger"
                size="sm"
                disabled={loading}
                onClick={() => cambiarEstado('cancelado')}
              >
                {loading ? 'Cancelando…' : 'Confirmar cancelación'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setCancelando(false)}>
                Volver
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button size="sm" disabled={loading} onClick={() => cambiarEstado('confirmado')}>
              {loading ? 'Confirmando…' : 'Confirmar pedido'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => setCancelando(true)}
            >
              Cancelar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function BandejaPanel({
  onCountChange,
}: {
  onCountChange?: (count: number) => void;
}) {
  const [pedidos, setPedidos] = useState<PedidoDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(() => {
    api
      .get<PedidoDto[]>('/pedidos/bandeja')
      .then((lista) => {
        setPedidos(lista);
        onCountChange?.(lista.length);
      })
      .catch(() => setError('No se pudo cargar la bandeja de pedidos virtuales.'));
  }, [onCountChange]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Refresco por WS: entra un virtual nuevo o alguien lo resolvió desde otro lado.
  useEffect(() => {
    const socket = getSocket();
    const onNuevo = (e: PedidoVirtualNuevoEvent) => {
      setPedidos((ps) => {
        if (!ps) return ps;
        if (ps.some((p) => p.id === e.pedido.id)) return ps;
        const next = [...ps, e.pedido];
        onCountChange?.(next.length);
        return next;
      });
    };
    const onEstado = (e: PedidoEstadoEvent) => {
      if (e.estado === 'pendiente') return;
      setPedidos((ps) => {
        const next = ps?.filter((p) => p.id !== e.pedidoId) ?? ps;
        if (next) onCountChange?.(next.length);
        return next;
      });
    };
    socket.on(EVENTS.pedidoVirtualNuevo, onNuevo);
    socket.on(EVENTS.pedidoEstado, onEstado);
    return () => {
      socket.off(EVENTS.pedidoVirtualNuevo, onNuevo);
      socket.off(EVENTS.pedidoEstado, onEstado);
    };
  }, [onCountChange]);

  const quitar = useCallback(
    (pedidoId: string) => {
      setPedidos((ps) => {
        const next = ps?.filter((p) => p.id !== pedidoId) ?? ps;
        if (next) onCountChange?.(next.length);
        return next;
      });
    },
    [onCountChange],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          Pedidos online esperando confirmación del local.
        </p>
        <Button variant="ghost" size="sm" onClick={cargar}>
          Actualizar
        </Button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {pedidos === null && !error && <p className="text-sm text-zinc-400">Cargando…</p>}
      {pedidos?.length === 0 && (
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-zinc-400">
              No hay pedidos virtuales pendientes. Los nuevos aparecen acá en tiempo real.
            </p>
          </CardContent>
        </Card>
      )}
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {pedidos?.map((p) => (
          <PedidoVirtualCard key={p.id} pedido={p} onResuelto={quitar} />
        ))}
      </div>
    </div>
  );
}
