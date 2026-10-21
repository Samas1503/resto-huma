'use client';

// Panel lateral de reservas del día (estilo Eat App): hora, mesa, personas,
// contacto y acciones de estado según el ciclo pendiente → confirmada → cumplida.
import type { EstadoReserva } from '@resto-huma/shared';
import { formatTime } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RESERVA_LABEL, RESERVA_TONE } from './labels';
import type { ReservaView } from './types';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const ACCIONES: Partial<Record<EstadoReserva, { estado: EstadoReserva; label: string; variant: ButtonVariant }[]>> = {
  pendiente: [
    { estado: 'confirmada', label: 'Confirmar', variant: 'primary' },
    { estado: 'cancelada', label: 'Cancelar', variant: 'danger' },
  ],
  confirmada: [
    { estado: 'cumplida', label: 'Cumplida', variant: 'primary' },
    { estado: 'no_show', label: 'No vino', variant: 'secondary' },
    { estado: 'cancelada', label: 'Cancelar', variant: 'danger' },
  ],
};

export interface ReservasPanelProps {
  reservas: ReservaView[];
  /** id de la reserva con una acción en curso (deshabilita sus botones). */
  pendingId: string | null;
  onChangeEstado: (reserva: ReservaView, estado: EstadoReserva) => void;
}

export function ReservasPanel({ reservas, pendingId, onChangeEstado }: ReservasPanelProps) {
  const activas = reservas.filter((r) => r.estado === 'pendiente' || r.estado === 'confirmada');
  const cerradas = reservas.filter((r) => !activas.includes(r));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reservas del día</CardTitle>
        <CardDescription>
          {activas.length} activas · {reservas.length} en total
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {reservas.length === 0 && (
          <p className="text-sm text-zinc-400">No hay reservas para hoy.</p>
        )}
        {[...activas, ...cerradas].map((reserva) => (
          <div
            key={reserva.id}
            className="flex flex-col gap-2 rounded-lg border border-zinc-100 p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-zinc-900">
                {formatTime(reserva.fechaHora)}
              </span>
              <Badge tone={RESERVA_TONE[reserva.estado]}>
                {RESERVA_LABEL[reserva.estado]}
              </Badge>
            </div>
            <div className="text-xs text-zinc-600">
              <p>
                Mesa {reserva.mesa.numero}
                {reserva.mesa.zona ? ` · ${reserva.mesa.zona}` : ''} ·{' '}
                {reserva.cantidadPersonas}{' '}
                {reserva.cantidadPersonas === 1 ? 'persona' : 'personas'}
              </p>
              <p className="mt-0.5 truncate text-zinc-400">
                {reserva.cliente?.nombre ?? 'Sin cliente'} · {reserva.telefonoContacto}
              </p>
              {reserva.notas && (
                <p className="mt-0.5 italic text-zinc-400">“{reserva.notas}”</p>
              )}
            </div>
            {(ACCIONES[reserva.estado]?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {ACCIONES[reserva.estado]!.map((accion) => (
                  <Button
                    key={accion.estado}
                    size="sm"
                    variant={accion.variant}
                    disabled={pendingId === reserva.id}
                    onClick={() => onChangeEstado(reserva, accion.estado)}
                  >
                    {accion.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
