'use client';

// Controles de admin sobre la mesa: cambio manual de estado y asignación de
// mozo en el turno abierto (POST /turnos/:id/asignaciones).
import { useEffect, useState } from 'react';
import type { EstadoMesa, MesaDto, UsuarioDto } from '@resto-huma/shared';
import { api, ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MESA_LABEL } from './labels';
import type { TurnoView } from './types';

const ESTADOS: EstadoMesa[] = ['libre', 'ocupada', 'cuenta_pedida'];
const SELECT_CLASS =
  'h-9 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400';

export interface AdminMesaCardProps {
  mesa: MesaDto;
  turno: TurnoView | null;
  onChanged: () => void;
}

export function AdminMesaCard({ mesa, turno, onChanged }: AdminMesaCardProps) {
  const [mozos, setMozos] = useState<UsuarioDto[]>([]);
  const [mozoId, setMozoId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const asignacion = turno?.mozoMesaTurnos.find((a) => a.mesaId === mesa.id) ?? null;

  useEffect(() => {
    api
      .get<UsuarioDto[]>('/usuarios')
      .then((usuarios) =>
        setMozos(usuarios.filter((u) => u.rol === 'mozo' && u.activo)),
      )
      .catch(() => {});
  }, []);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo completar la acción');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Administración de la mesa</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div>
          <p className="mb-1.5 text-xs font-medium text-zinc-700">Estado de la mesa</p>
          <div className="flex gap-1.5">
            {ESTADOS.map((estado) => (
              <Button
                key={estado}
                size="sm"
                variant={mesa.estado === estado ? 'primary' : 'secondary'}
                disabled={busy || mesa.estado === estado}
                onClick={() =>
                  run(() => api.patch(`/mesas/${mesa.id}/estado`, { estado }))
                }
              >
                {MESA_LABEL[estado]}
              </Button>
            ))}
          </div>
        </div>

        {turno && (
          <div>
            <p className="mb-1.5 text-xs font-medium text-zinc-700">
              Mozo asignado en el turno
            </p>
            {asignacion ? (
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-zinc-800">{asignacion.usuario.nombre}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() =>
                    run(() => api.del(`/turnos/asignaciones/${asignacion.id}`))
                  }
                >
                  Desasignar
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <select
                  className={cn(SELECT_CLASS)}
                  value={mozoId}
                  onChange={(e) => setMozoId(e.target.value)}
                >
                  <option value="">Elegir mozo…</option>
                  {mozos.map((mozo) => (
                    <option key={mozo.id} value={mozo.id}>
                      {mozo.nombre}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy || !mozoId}
                  onClick={() =>
                    run(() =>
                      api.post(`/turnos/${turno.id}/asignaciones`, {
                        usuarioId: mozoId,
                        mesaId: mesa.id,
                      }),
                    )
                  }
                >
                  Asignar
                </Button>
              </div>
            )}
          </div>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}
      </CardContent>
    </Card>
  );
}
