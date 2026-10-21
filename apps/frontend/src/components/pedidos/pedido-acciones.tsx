'use client';

// Acciones de transición de estadoAtencion para un pedido (PATCH /pedidos/:id/estado).
// Replica las validaciones del backend: en_reparto solo en delivery, y un pedido
// delivery no puede saltar de listo a entregado. Cancelar exige motivo.
import { useState } from 'react';
import type { EstadoAtencion, PedidoDto } from '@resto-huma/shared';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ACCION_LABEL, TRANSICIONES } from './labels';

function destinosVisibles(pedido: PedidoDto): EstadoAtencion[] {
  return TRANSICIONES[pedido.estadoAtencion].filter((destino) => {
    if (destino === 'en_reparto' && pedido.subtipo !== 'delivery') return false;
    if (
      destino === 'entregado' &&
      pedido.subtipo === 'delivery' &&
      pedido.estadoAtencion !== 'en_reparto'
    ) {
      return false;
    }
    return true;
  });
}

export interface PedidoAccionesProps {
  pedido: PedidoDto;
  onChanged: () => void;
}

export function PedidoAcciones({ pedido, onChanged }: PedidoAccionesProps) {
  const [busy, setBusy] = useState<EstadoAtencion | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);

  const destinos = destinosVisibles(pedido);
  const avanzar = destinos.filter((d) => d !== 'cancelado');
  const puedeCancelar = destinos.includes('cancelado');

  async function cambiar(estado: EstadoAtencion, motivoCancelacion?: string) {
    setBusy(estado);
    setError(null);
    try {
      await api.patch(`/pedidos/${pedido.id}/estado`, { estado, motivoCancelacion });
      setCancelando(false);
      setMotivo('');
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo actualizar el pedido');
    } finally {
      setBusy(null);
    }
  }

  if (destinos.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {avanzar.map((destino) => (
          <Button
            key={destino}
            size="sm"
            variant={destino === 'entregado' ? 'primary' : 'secondary'}
            disabled={busy !== null}
            onClick={() => void cambiar(destino)}
          >
            {busy === destino ? 'Aplicando…' : ACCION_LABEL[destino]}
          </Button>
        ))}
        {puedeCancelar && !cancelando && (
          <Button size="sm" variant="danger" disabled={busy !== null} onClick={() => setCancelando(true)}>
            Cancelar pedido
          </Button>
        )}
      </div>

      {cancelando && (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (motivo.trim()) void cambiar('cancelado', motivo.trim());
          }}
        >
          <Input
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo de cancelación (obligatorio)"
            className="w-72"
            autoFocus
          />
          <Button type="submit" size="sm" variant="danger" disabled={busy !== null || !motivo.trim()}>
            Confirmar cancelación
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setCancelando(false)}>
            Volver
          </Button>
        </form>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
