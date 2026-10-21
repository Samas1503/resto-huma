'use client';

// Card de una comanda en la bandeja de cocina: destino (mesa/subtipo), origen,
// tiempo transcurrido, ítems y acciones de cambio de estado.
import type { ComandaDto, EstadoComanda, ItemPedidoDto, PedidoDto } from '@resto-huma/shared';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const PRESENTACION_LABEL: Record<string, string> = {
  docena: 'docena',
  media_docena: 'media docena',
};

const ESTADO_LABEL: Record<EstadoComanda, string> = {
  pendiente: 'Pendiente',
  en_preparacion: 'En preparación',
  lista: 'Lista',
  anulada: 'Anulada',
};

function destinoLabel(pedido: PedidoDto | undefined, mesaNumero: number | undefined): string {
  switch (pedido?.subtipo) {
    case 'mesa':
      return mesaNumero !== undefined ? `Mesa ${mesaNumero}` : 'Mesa';
    case 'mostrador':
      return 'Mostrador';
    case 'takeaway':
      return 'Para llevar';
    case 'delivery':
      return 'Delivery';
    default:
      return 'Pedido';
  }
}

function elapsed(createdAt: string, now: number): { label: string; min: number } {
  const min = Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 60_000));
  if (min < 1) return { label: 'recién', min };
  if (min < 60) return { label: `${min} min`, min };
  return { label: `${Math.floor(min / 60)} h ${min % 60} min`, min };
}

function itemLabel(
  item: ItemPedidoDto,
  productoNombre: (id: string) => string | undefined,
  variedadNombre: (id: string) => string | undefined,
): string {
  const producto = productoNombre(item.productoId) ?? 'Producto';
  const variedad = item.variedadId ? variedadNombre(item.variedadId) : undefined;
  const presentacion =
    item.presentacion && item.presentacion !== 'unidad'
      ? PRESENTACION_LABEL[item.presentacion]
      : undefined;
  return [
    `${item.cantidad}× ${producto}`,
    variedad ? `(${variedad})` : null,
    presentacion ? `· ${presentacion}` : null,
  ]
    .filter(Boolean)
    .join(' ');
}

export interface ComandaCardProps {
  comanda: ComandaDto;
  pedido: PedidoDto | undefined;
  mesaNumero: number | undefined;
  productoNombre: (id: string) => string | undefined;
  variedadNombre: (id: string) => string | undefined;
  now: number;
  flashing: boolean;
  busy: boolean;
  onCambiarEstado: (comandaId: string, estado: EstadoComanda) => void;
}

export function ComandaCard({
  comanda,
  pedido,
  mesaNumero,
  productoNombre,
  variedadNombre,
  now,
  flashing,
  busy,
  onCambiarEstado,
}: ComandaCardProps) {
  const { label: tiempo, min } = elapsed(comanda.createdAt, now);
  const anulada = comanda.estado === 'anulada';

  return (
    <Card
      className={cn(
        'border-l-4 transition-colors',
        comanda.estado === 'pendiente' && 'border-l-amber-400',
        comanda.estado === 'en_preparacion' && 'border-l-sky-400',
        anulada && 'border-l-zinc-300 opacity-60',
        flashing && 'animate-pulse bg-amber-50 ring-2 ring-amber-400',
      )}
    >
      <div className="flex items-start justify-between gap-2 p-4 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-base font-semibold text-zinc-900">
            {destinoLabel(pedido, mesaNumero)}
          </span>
          <Badge tone={comanda.origen === 'sistema' ? 'violet' : 'blue'}>
            {comanda.origen === 'sistema' ? 'Sistema' : 'Mozo'}
          </Badge>
          {pedido?.canal === 'virtual' && <Badge tone="amber">Virtual</Badge>}
          {anulada && <Badge tone="red">{ESTADO_LABEL.anulada}</Badge>}
        </div>
        <span
          className={cn(
            'shrink-0 text-xs font-medium tabular-nums',
            min >= 30 ? 'text-red-600' : min >= 15 ? 'text-amber-600' : 'text-zinc-500',
          )}
          title={new Date(comanda.createdAt).toLocaleTimeString('es-AR')}
        >
          {now ? tiempo : '—'}
        </span>
      </div>

      <ul className="flex flex-col gap-1 px-4 pb-2">
        {comanda.items.map((item) => (
          <li key={item.id} className="text-sm">
            <span className={cn('text-zinc-800', anulada && 'line-through')}>
              {itemLabel(item, productoNombre, variedadNombre)}
            </span>
            {item.notas && (
              <span className="ml-2 text-xs italic text-zinc-500">“{item.notas}”</span>
            )}
          </li>
        ))}
      </ul>

      {comanda.notas && (
        <p className="mx-4 mb-2 rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
          {comanda.notas}
        </p>
      )}

      {!anulada && comanda.estado !== 'lista' && (
        <div className="flex items-center gap-2 border-t border-zinc-100 p-3">
          {comanda.estado === 'pendiente' && (
            <Button
              size="sm"
              disabled={busy}
              onClick={() => onCambiarEstado(comanda.id, 'en_preparacion')}
            >
              Empezar preparación
            </Button>
          )}
          {comanda.estado === 'en_preparacion' && (
            <Button
              size="sm"
              disabled={busy}
              onClick={() => onCambiarEstado(comanda.id, 'lista')}
            >
              Marcar lista
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => onCambiarEstado(comanda.id, 'anulada')}
          >
            Anular
          </Button>
        </div>
      )}
    </Card>
  );
}
