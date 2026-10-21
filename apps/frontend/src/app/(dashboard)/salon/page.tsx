'use client';

// Salón: mapa de mesas del turno (estilo Eat App) + reservas del día.
// Refresco por eventos de socket + polling suave como respaldo.
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  EVENTS,
  type EstadoReserva,
  type MesaDto,
} from '@resto-huma/shared';
import { api, ApiError } from '@/lib/api';
import { formatTime } from '@/lib/format';
import { getSocket } from '@/lib/socket';
import { Badge } from '@/components/ui/badge';
import { RoleGuard } from '@/components/ui/role-guard';
import { MesaGrid } from '@/components/salon/mesa-grid';
import { ReservasPanel } from '@/components/salon/reservas-panel';
import { usePolling } from '@/components/salon/use-polling';
import type { ReservaView, TurnoView } from '@/components/salon/types';

const POLLING_MS = 12_000;

function SalonView() {
  const router = useRouter();
  const [mesas, setMesas] = useState<MesaDto[] | null>(null);
  const [turno, setTurno] = useState<TurnoView | null>(null);
  const [reservas, setReservas] = useState<ReservaView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingReserva, setPendingReserva] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [mesasData, turnos, reservasData] = await Promise.all([
      api.get<MesaDto[]>('/mesas'),
      api.get<TurnoView[]>('/turnos'),
      api.get<ReservaView[]>('/reservas/del-dia'),
    ]);
    setMesas(mesasData);
    setTurno(turnos.find((t) => !t.cierre) ?? null);
    setReservas(reservasData);
  }, []);

  // Microtask: los setState quedan dentro del callback (regla set-state-in-effect).
  useEffect(() => {
    void Promise.resolve()
      .then(load)
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar el salón'),
      );
  }, [load]);

  usePolling(() => load().catch(() => {}), POLLING_MS);

  // Refresco inmediato ante eventos realtime (comandas, estados, cobros).
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

  const cambiarEstadoReserva = async (reserva: ReservaView, estado: EstadoReserva) => {
    setPendingReserva(reserva.id);
    setError(null);
    try {
      await api.patch(`/reservas/${reserva.id}`, { estado });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo actualizar la reserva');
    } finally {
      setPendingReserva(null);
    }
  };

  const asignaciones = new Map(
    (turno?.mozoMesaTurnos ?? []).map((a) => [a.mesaId, a] as const),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">Salón</h1>
          <p className="text-sm text-zinc-500">
            Mapa de mesas del turno · tocá una mesa para atenderla.
          </p>
        </div>
        {turno ? (
          <Badge tone="green" className="px-3 py-1 text-sm capitalize">
            Turno {turno.tipo} · desde las {formatTime(turno.apertura)}
          </Badge>
        ) : (
          <Badge tone="amber" className="px-3 py-1 text-sm">
            Sin turno abierto — no se pueden tomar pedidos
          </Badge>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_340px]">
        {mesas === null ? (
          <p className="text-sm text-zinc-400">Cargando mesas…</p>
        ) : mesas.length === 0 ? (
          <p className="text-sm text-zinc-400">
            No hay mesas cargadas. Las crea un admin desde el módulo de administración.
          </p>
        ) : (
          <MesaGrid
            mesas={mesas}
            asignaciones={asignaciones}
            onSelect={(mesa) => router.push(`/salon/mesa/${mesa.id}`)}
          />
        )}

        <ReservasPanel
          reservas={reservas}
          pendingId={pendingReserva}
          onChangeEstado={cambiarEstadoReserva}
        />
      </div>

      <div className="flex gap-4 text-xs text-zinc-400">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-zinc-300" /> Libre
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-emerald-500" /> Ocupada
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-amber-500" /> Cuenta pedida
        </span>
      </div>
    </div>
  );
}

export default function SalonPage() {
  return (
    <RoleGuard roles={['admin', 'mozo']}>
      <SalonView />
    </RoleGuard>
  );
}
