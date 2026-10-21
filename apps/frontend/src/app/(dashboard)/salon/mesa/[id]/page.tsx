'use client';

// Vista mozo de una mesa: si hay cuenta abierta muestra ítems por comanda,
// estados y total; si la mesa está libre permite abrir la cuenta tomando el
// primer pedido. "Pedir cuenta" marca el pedido entregado y la mesa ámbar.
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import {
  EVENTS,
  type EstadoAtencion,
  type MesaDto,
  type PedidoDto,
  type ProductoDto,
} from '@resto-huma/shared';
import { api, ApiError } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useRequireRol } from '@/lib/use-require-rol';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RoleGuard } from '@/components/ui/role-guard';
import { IconChevronRight } from '@/components/ui/icons';
import { AdminMesaCard } from '@/components/salon/admin-mesa-card';
import { CartaPanel, type DraftPayload } from '@/components/salon/carta-panel';
import { ComandasList } from '@/components/salon/comandas-list';
import {
  ATENCION_LABEL,
  ATENCION_TONE,
  MESA_LABEL,
  MESA_TONE,
  PAGO_LABEL,
  PAGO_TONE,
} from '@/components/salon/labels';
import { usePolling } from '@/components/salon/use-polling';
import type { TurnoView } from '@/components/salon/types';

const POLLING_MS = 10_000;
// Estados en los que el backend admite adiciones (ESTADOS_ADICIONABLES en pedidos.service).
const ADICIONABLES: EstadoAtencion[] = ['confirmado', 'en_preparacion', 'listo'];

function MesaView() {
  const { id: mesaId } = useParams<{ id: string }>();
  const { session } = useRequireRol('admin', 'mozo');

  const [mesa, setMesa] = useState<MesaDto | null>(null);
  const [pedido, setPedido] = useState<PedidoDto | null>(null);
  const [turno, setTurno] = useState<TurnoView | null>(null);
  const [productos, setProductos] = useState<ProductoDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agregando, setAgregando] = useState(false);
  const [busyCuenta, setBusyCuenta] = useState(false);

  const load = useCallback(async () => {
    const [mesaData, pedidos, turnos] = await Promise.all([
      api.get<MesaDto>(`/mesas/${mesaId}`),
      api.get<PedidoDto[]>(`/pedidos?mesaId=${mesaId}&subtipo=mesa`),
      api.get<TurnoView[]>('/turnos'),
    ]);
    setMesa(mesaData);
    setTurno(turnos.find((t) => !t.cierre) ?? null);
    // La "cuenta" es el pedido de la mesa sin cancelar y aún no cobrado
    // (listado ordenado por createdAt desc → el primero que matchea).
    setPedido(
      pedidos.find(
        (p) => p.estadoAtencion !== 'cancelado' && p.estadoPago === 'pendiente_de_cobro',
      ) ?? null,
    );
  }, [mesaId]);

  // Microtask: los setState quedan dentro del callback (regla set-state-in-effect).
  useEffect(() => {
    void Promise.resolve()
      .then(load)
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar la mesa'),
      )
      .finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    api.get<ProductoDto[]>('/carta').then(setProductos).catch(() => {});
  }, []);

  usePolling(() => load().catch(() => {}), POLLING_MS);

  useEffect(() => {
    const socket = getSocket();
    const refresh = () => load().catch(() => {});
    socket.on(EVENTS.pedidoEstado, refresh);
    socket.on(EVENTS.comandaNueva, refresh);
    socket.on(EVENTS.comandaEstado, refresh);
    socket.on(EVENTS.pagoConfirmado, refresh);
    return () => {
      socket.off(EVENTS.pedidoEstado, refresh);
      socket.off(EVENTS.comandaNueva, refresh);
      socket.off(EVENTS.comandaEstado, refresh);
      socket.off(EVENTS.pagoConfirmado, refresh);
    };
  }, [load]);

  // Abrir cuenta: el backend crea pedido confirmado + primera comanda y
  // marca la mesa ocupada en la misma transacción.
  const crearPedido = async ({ items }: DraftPayload) => {
    await api.post<PedidoDto>('/pedidos', {
      canal: 'presencial',
      subtipo: 'mesa',
      mesaId,
      items,
    });
    await load();
  };

  // Adición: genera una NUEVA comanda dentro del mismo pedido.
  const agregarItems = async ({ items, notasComanda }: DraftPayload) => {
    if (!pedido) return;
    await api.post<PedidoDto>(`/pedidos/${pedido.id}/items`, {
      items,
      notas: notasComanda,
    });
    setAgregando(false);
    await load();
  };

  const pedirCuenta = async () => {
    if (!mesa) return;
    setBusyCuenta(true);
    setError(null);
    try {
      // El ciclo de atención solo permite listo → entregado; en otros estados
      // la mesa igual pasa a cuenta_pedida (el comensal pidió la cuenta).
      if (pedido?.estadoAtencion === 'listo') {
        await api.patch(`/pedidos/${pedido.id}/estado`, { estado: 'entregado' });
      }
      await api.patch(`/mesas/${mesa.id}/estado`, { estado: 'cuenta_pedida' });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo pedir la cuenta');
    } finally {
      setBusyCuenta(false);
    }
  };

  const asignacion = turno?.mozoMesaTurnos.find((a) => a.mesaId === mesaId) ?? null;
  const admiteAdicion = pedido && ADICIONABLES.includes(pedido.estadoAtencion);

  if (loading) {
    return <p className="text-sm text-zinc-400">Cargando mesa…</p>;
  }
  if (!mesa) {
    return <p className="text-sm text-zinc-500">Mesa no encontrada.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/salon"
            className="mb-1 inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600"
          >
            <IconChevronRight className="size-3 rotate-180" /> Volver al salón
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
              Mesa {mesa.numero}
            </h1>
            <Badge tone={MESA_TONE[mesa.estado]}>{MESA_LABEL[mesa.estado]}</Badge>
            {pedido && (
              <>
                <Badge tone={ATENCION_TONE[pedido.estadoAtencion]}>
                  {ATENCION_LABEL[pedido.estadoAtencion]}
                </Badge>
                <Badge tone={PAGO_TONE[pedido.estadoPago]}>
                  {PAGO_LABEL[pedido.estadoPago]}
                </Badge>
              </>
            )}
          </div>
          <p className="text-sm text-zinc-500">
            {mesa.zona ?? 'Sin zona'} · {mesa.capacidad} personas
            {asignacion && ` · Mozo: ${asignacion.usuario.nombre}`}
          </p>
        </div>
        {pedido && mesa.estado !== 'cuenta_pedida' && (
          <Button variant="secondary" disabled={busyCuenta} onClick={pedirCuenta}>
            {busyCuenta ? 'Procesando…' : 'Pedir cuenta'}
          </Button>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {!turno && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          No hay un turno abierto: el pedido no se puede registrar hasta que un
          admin abra el turno.
        </p>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-4">
          {pedido ? (
            <>
              <ComandasList
                comandas={pedido.comandas}
                items={pedido.items}
                productos={productos}
              />
              {admiteAdicion && !agregando && (
                <Button variant="secondary" onClick={() => setAgregando(true)}>
                  Agregar ítems (nueva comanda)
                </Button>
              )}
            </>
          ) : (
            <CartaPanel
              productos={productos}
              submitLabel="Abrir cuenta y enviar a cocina"
              disabled={!turno}
              onSubmit={crearPedido}
            />
          )}

          {agregando && pedido && (
            <div className="flex flex-col gap-2">
              <CartaPanel
                productos={productos}
                submitLabel="Enviar adición a cocina"
                showComandaNota
                disabled={!turno}
                onSubmit={agregarItems}
              />
              <Button variant="ghost" size="sm" onClick={() => setAgregando(false)}>
                Cancelar adición
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {session?.rol === 'admin' && (
            <AdminMesaCard mesa={mesa} turno={turno} onChanged={() => load().catch(() => {})} />
          )}
        </div>
      </div>
    </div>
  );
}

export default function MesaPage() {
  return (
    <RoleGuard roles={['admin', 'mozo']}>
      {/* cacheComponents: useParams suspende en rutas dinámicas → boundary requerido */}
      <Suspense fallback={<p className="text-sm text-zinc-400">Cargando…</p>}>
        <MesaView />
      </Suspense>
    </RoleGuard>
  );
}
