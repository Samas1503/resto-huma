'use client';

// Admin de reservas (estilo Eat App): tabla filtrable por estado
// (GET /reservas?estado=), acciones por estado vía PATCH, carga manual
// (POST /reservas) y baja (DELETE, solo admin).
// Ciclo: pendiente → confirmada → cumplida (o cancelada / no_show).
import { useState } from 'react';
import type { FormEvent } from 'react';
import type { EstadoReserva } from '@resto-huma/shared';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import type { MesaApi, ReservaApi } from './api-types';
import { EmptyState, FormError, Select } from './fields';
import { errorMessage, useApiList } from './use-api-list';

const ESTADOS: { value: EstadoReserva; label: string }[] = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'confirmada', label: 'Confirmada' },
  { value: 'cumplida', label: 'Cumplida' },
  { value: 'cancelada', label: 'Cancelada' },
  { value: 'no_show', label: 'No show' },
];

const estadoLabel = (e: EstadoReserva) => ESTADOS.find((x) => x.value === e)?.label ?? e;

const estadoTone: Record<EstadoReserva, 'amber' | 'green' | 'neutral' | 'red' | 'blue'> = {
  pendiente: 'amber',
  confirmada: 'blue',
  cumplida: 'green',
  cancelada: 'red',
  no_show: 'neutral',
};

// Transiciones útiles que ofrece el admin desde cada estado.
const ACCIONES: Record<EstadoReserva, { estado: EstadoReserva; label: string }[]> = {
  pendiente: [
    { estado: 'confirmada', label: 'Confirmar' },
    { estado: 'cancelada', label: 'Cancelar' },
  ],
  confirmada: [
    { estado: 'cumplida', label: 'Cumplir' },
    { estado: 'no_show', label: 'No show' },
    { estado: 'cancelada', label: 'Cancelar' },
  ],
  cumplida: [],
  cancelada: [],
  no_show: [],
};

// ─── Alta manual de reserva ──────────────────────────────────
function ReservaForm({ mesas, onSaved }: { mesas: MesaApi[]; onSaved: () => void }) {
  const [mesaId, setMesaId] = useState('');
  const [fechaHora, setFechaHora] = useState('');
  const [cantidadPersonas, setCantidadPersonas] = useState('2');
  const [telefonoContacto, setTelefonoContacto] = useState('');
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post('/reservas', {
        mesaId,
        // datetime-local entrega hora local sin zona; IsDateString lo acepta.
        fechaHora: new Date(fechaHora).toISOString(),
        cantidadPersonas: Number(cantidadPersonas),
        telefonoContacto: telefonoContacto.trim(),
        ...(notas.trim() ? { notas: notas.trim() } : {}),
      });
      setMesaId('');
      setFechaHora('');
      setCantidadPersonas('2');
      setTelefonoContacto('');
      setNotas('');
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Select
          label="Mesa"
          required
          value={mesaId}
          onChange={(e) => setMesaId(e.target.value)}
        >
          <option value="" disabled>
            Elegí una mesa…
          </option>
          {mesas.map((m) => (
            <option key={m.id} value={m.id}>
              Mesa {m.numero}
              {m.zona ? ` — ${m.zona}` : ''} ({m.capacidad} pers.)
            </option>
          ))}
        </Select>
        <Input
          label="Fecha y hora"
          required
          type="datetime-local"
          value={fechaHora}
          onChange={(e) => setFechaHora(e.target.value)}
        />
        <Input
          label="Personas"
          required
          type="number"
          min={1}
          step={1}
          value={cantidadPersonas}
          onChange={(e) => setCantidadPersonas(e.target.value)}
        />
        <Input
          label="Teléfono de contacto"
          required
          value={telefonoContacto}
          onChange={(e) => setTelefonoContacto(e.target.value)}
          placeholder="Ej.: 388 412-3456"
        />
        <Input
          label="Notas (opcional)"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Ej.: cumpleaños, celíaco…"
        />
      </div>
      <FormError message={error} />
      <div>
        <Button type="submit" size="sm" disabled={saving || !mesaId || !fechaHora}>
          {saving ? 'Creando…' : 'Crear reserva'}
        </Button>
      </div>
    </form>
  );
}

// ─── Sección principal ───────────────────────────────────────
export function ReservasAdmin() {
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoReserva | ''>('');
  const { data: reservas, loading, error, reload } = useApiList<ReservaApi[]>(
    estadoFiltro ? `/reservas?estado=${estadoFiltro}` : '/reservas',
  );
  const mesasQ = useApiList<MesaApi[]>('/mesas');
  const [actionError, setActionError] = useState<string | null>(null);

  async function cambiarEstado(r: ReservaApi, estado: EstadoReserva) {
    setActionError(null);
    try {
      await api.patch(`/reservas/${r.id}`, { estado });
      reload();
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  async function eliminar(r: ReservaApi) {
    if (!window.confirm(`¿Eliminar la reserva de la mesa ${r.mesa.numero} del ${formatDateTime(r.fechaHora)}?`))
      return;
    setActionError(null);
    try {
      await api.del(`/reservas/${r.id}`);
      reload();
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Nueva reserva manual</CardTitle>
          <CardDescription>
            Carga telefónica o mostrador. El backend valida capacidad y
            solapamiento (±2 h sobre la misma mesa).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReservaForm mesas={mesasQ.data ?? []} onSaved={reload} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Reservas</CardTitle>
              <CardDescription>Ordenadas por fecha y hora.</CardDescription>
            </div>
            <div className="w-48">
              <Select
                value={estadoFiltro}
                onChange={(e) => setEstadoFiltro(e.target.value as EstadoReserva | '')}
              >
                <option value="">Todos los estados</option>
                {ESTADOS.map((e) => (
                  <option key={e.value} value={e.value}>
                    {e.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <FormError message={error ?? actionError} />
          {loading ? (
            <EmptyState>Cargando reservas…</EmptyState>
          ) : !reservas || reservas.length === 0 ? (
            <EmptyState>No hay reservas para este filtro.</EmptyState>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Fecha y hora</TH>
                  <TH>Mesa</TH>
                  <TH>Cliente</TH>
                  <TH>Personas</TH>
                  <TH>Teléfono</TH>
                  <TH>Notas</TH>
                  <TH>Estado</TH>
                  <TH className="text-right">Acciones</TH>
                </TR>
              </THead>
              <TBody>
                {reservas.map((r) => (
                  <TR key={r.id}>
                    <TD className="whitespace-nowrap">{formatDateTime(r.fechaHora)}</TD>
                    <TD>
                      Mesa {r.mesa.numero}
                      {r.mesa.zona && <span className="text-zinc-400"> · {r.mesa.zona}</span>}
                    </TD>
                    <TD>{r.cliente?.nombre ?? <span className="text-zinc-400">—</span>}</TD>
                    <TD>{r.cantidadPersonas}</TD>
                    <TD>{r.telefonoContacto}</TD>
                    <TD className="max-w-40 truncate">{r.notas ?? '—'}</TD>
                    <TD>
                      <Badge tone={estadoTone[r.estado]}>{estadoLabel(r.estado)}</Badge>
                    </TD>
                    <TD className="text-right">
                      <div className="flex justify-end gap-1">
                        {ACCIONES[r.estado].map((a) => (
                          <Button
                            key={a.estado}
                            size="sm"
                            variant={a.estado === 'cancelada' ? 'ghost' : 'secondary'}
                            onClick={() => cambiarEstado(r, a.estado)}
                          >
                            {a.label}
                          </Button>
                        ))}
                        <Button size="sm" variant="ghost" onClick={() => eliminar(r)}>
                          Eliminar
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
