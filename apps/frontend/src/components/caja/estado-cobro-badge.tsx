'use client';

// Estado de un cobro con referenciaExterna (pasarela manual o externa):
// GET /pagos/cobros/:referenciaExterna → { estado: pendiente|aprobado|rechazado }.
import { useCallback, useEffect, useState } from 'react';
import type { EstadoCobroPasarela, ResultadoConfirmarCobro } from '@resto-huma/shared';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';

const TONE: Record<EstadoCobroPasarela, 'amber' | 'green' | 'red'> = {
  pendiente: 'amber',
  aprobado: 'green',
  rechazado: 'red',
};

const LABEL: Record<EstadoCobroPasarela, string> = {
  pendiente: 'Cobro pendiente',
  aprobado: 'Cobro aprobado',
  rechazado: 'Cobro rechazado',
};

export function EstadoCobroBadge({
  referenciaExterna,
  onChange,
}: {
  referenciaExterna: string;
  onChange?: (estado: EstadoCobroPasarela) => void;
}) {
  const [estado, setEstado] = useState<EstadoCobroPasarela | 'consultando' | 'error'>(
    'consultando',
  );

  const consultar = useCallback(() => {
    api
      .get<ResultadoConfirmarCobro>(`/pagos/cobros/${encodeURIComponent(referenciaExterna)}`)
      .then((res) => {
        setEstado(res.estado);
        onChange?.(res.estado);
      })
      .catch(() => setEstado('error'));
  }, [referenciaExterna, onChange]);

  useEffect(() => {
    consultar();
  }, [consultar]);

  const reintentar = () => {
    setEstado('consultando');
    consultar();
  };

  if (estado === 'consultando') return <Badge tone="neutral">Consultando…</Badge>;
  if (estado === 'error') {
    return (
      <button
        type="button"
        onClick={reintentar}
        className="text-xs text-zinc-500 underline underline-offset-2 hover:text-zinc-700"
        title="Reintentar consulta del estado del cobro"
      >
        Sin estado — reintentar
      </button>
    );
  }
  return (
    <button type="button" onClick={reintentar} title="Actualizar estado del cobro">
      <Badge tone={TONE[estado]}>{LABEL[estado]}</Badge>
    </button>
  );
}
