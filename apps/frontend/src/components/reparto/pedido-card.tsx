'use client';

// Card de pedido delivery para la bandeja del repartidor (mobile-first:
// apilada, botones grandes para uso en teléfono).
// "problema" persiste el motivo como cancelación del pedido
// (CambiarEstadoAtencionDto.motivoCancelacion — única vía del contrato).
import { useState } from 'react';
import type { ItemPedidoDto, PedidoDto, Presentacion } from '@resto-huma/shared';
import { formatArs, formatTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

/** productoId/variedadId → nombre visible ("Empanada carne"). */
export type NombresProducto = Map<string, string>;

const PRESENTACION_LABEL: Record<Presentacion, string> = {
  unidad: 'unidad',
  media_docena: '½ docena',
  docena: 'docena',
};

function itemLabel(item: ItemPedidoDto, nombres: NombresProducto): string {
  const nombre =
    (item.variedadId && nombres.get(item.variedadId)) ??
    nombres.get(item.productoId) ??
    'ítem';
  const presentacion = PRESENTACION_LABEL[item.presentacion ?? 'unidad'];
  return `${item.cantidad}× ${nombre}${presentacion !== 'unidad' ? ` (${presentacion})` : ''}`;
}

function totalArs(pedido: PedidoDto): number {
  return pedido.items.reduce((acc, item) => acc + item.subtotalArs, 0) + pedido.costoEnvioArs;
}

export function numeroPedido(id: string): string {
  return `#${id.slice(-6).toUpperCase()}`;
}

export interface PedidoCardProps {
  pedido: PedidoDto;
  nombres: NombresProducto;
  /** Mutation en vuelo sobre este pedido. */
  pending: boolean;
  onTomar?: (pedido: PedidoDto) => void;
  onEntregar?: (pedido: PedidoDto) => void;
  /** Reporta un problema: cancela el pedido con motivo. */
  onProblema?: (pedido: PedidoDto, motivo: string) => void;
}

export function PedidoCard({ pedido, nombres, pending, onTomar, onEntregar, onProblema }: PedidoCardProps) {
  const [problemaOpen, setProblemaOpen] = useState(false);
  const [motivo, setMotivo] = useState('');

  const referenciaHora = pedido.listoAt ?? pedido.createdAt;
  const envio = pedido.costoEnvioArs > 0;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-zinc-900">{numeroPedido(pedido.id)}</span>
          <Badge tone={pedido.estadoAtencion === 'listo' ? 'amber' : 'blue'}>
            {pedido.estadoAtencion === 'listo' ? 'Listo' : 'En reparto'}
          </Badge>
        </div>
        <span className="text-xs text-zinc-400">{formatTime(referenciaHora)}</span>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Dirección</p>
          <p className="text-sm font-medium text-zinc-900">
            {pedido.direccionSnapshot ?? 'Sin dirección registrada'}
          </p>
        </div>
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-zinc-500">
            Cliente{' '}
            <span className="font-medium text-zinc-800">
              {pedido.clienteId ? `#${pedido.clienteId.slice(-6).toUpperCase()}` : '—'}
            </span>
          </span>
          <Badge tone={pedido.estadoPago === 'cobrado' ? 'green' : 'neutral'}>
            {pedido.estadoPago === 'cobrado' ? 'Cobrado' : 'Cobrar al entregar'}
          </Badge>
        </div>

        <ul className="flex flex-col gap-1 rounded-lg bg-zinc-50 p-3 text-sm text-zinc-700">
          {pedido.items.map((item) => (
            <li key={item.id} className="flex flex-col">
              <span>{itemLabel(item, nombres)}</span>
              {item.notas && <span className="text-xs text-zinc-400">Nota: {item.notas}</span>}
            </li>
          ))}
        </ul>

        <div className="flex items-baseline justify-between text-sm">
          <span className="text-zinc-500">
            Total{envio ? ` (incl. envío ${formatArs(pedido.costoEnvioArs)})` : ''}
          </span>
          <span className="text-base font-semibold text-zinc-900">{formatArs(totalArs(pedido))}</span>
        </div>
      </CardContent>

      <CardFooter className={cn('flex-col items-stretch gap-2 sm:flex-row')}>
        {onTomar && (
          <Button
            size="lg"
            className="flex-1"
            disabled={pending}
            onClick={() => onTomar(pedido)}
          >
            {pending ? 'Tomando…' : 'Tomar para reparto'}
          </Button>
        )}
        {onEntregar && !problemaOpen && (
          <>
            <Button size="lg" className="flex-1" disabled={pending} onClick={() => onEntregar(pedido)}>
              {pending ? 'Entregando…' : 'Entregar'}
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="flex-1"
              disabled={pending}
              onClick={() => setProblemaOpen(true)}
            >
              Problema
            </Button>
          </>
        )}
        {onProblema && problemaOpen && (
          <div className="flex w-full flex-col gap-2">
            <Input
              label="Motivo del problema"
              placeholder="Ej.: cliente ausente, dirección incorrecta…"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              disabled={pending}
            />
            <div className="flex gap-2">
              <Button
                variant="danger"
                className="flex-1"
                disabled={pending || !motivo.trim()}
                onClick={() => onProblema(pedido, motivo.trim())}
              >
                {pending ? 'Cancelando…' : 'Cancelar pedido'}
              </Button>
              <Button variant="ghost" disabled={pending} onClick={() => setProblemaOpen(false)}>
                Volver
              </Button>
            </div>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
