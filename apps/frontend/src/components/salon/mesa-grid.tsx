'use client';

// Mapa de mesas del turno (estilo Eat App): tiles agrupadas por zona con
// color por estado — libre gris, ocupada verde, cuenta pedida ámbar.
import type { EstadoMesa, MesaDto } from '@resto-huma/shared';
import { cn } from '@/lib/utils';
import { IconUser } from '@/components/ui/icons';
import { MESA_LABEL } from './labels';
import type { AsignacionMozo } from './types';

const TILE: Record<EstadoMesa, string> = {
  libre: 'border-zinc-200 bg-white hover:border-zinc-400',
  ocupada: 'border-emerald-300 bg-emerald-50 hover:border-emerald-500',
  cuenta_pedida: 'border-amber-300 bg-amber-50 hover:border-amber-500',
};

const DOT: Record<EstadoMesa, string> = {
  libre: 'bg-zinc-300',
  ocupada: 'bg-emerald-500',
  cuenta_pedida: 'bg-amber-500',
};

export interface MesaGridProps {
  mesas: MesaDto[];
  /** Mapa mesaId → asignación de mozo del turno actual. */
  asignaciones: Map<string, AsignacionMozo>;
  onSelect: (mesa: MesaDto) => void;
}

export function MesaGrid({ mesas, asignaciones, onSelect }: MesaGridProps) {
  const zonas = [...new Set(mesas.map((m) => m.zona ?? 'Sin zona'))].sort();

  return (
    <div className="flex flex-col gap-6">
      {zonas.map((zona) => (
        <section key={zona}>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            {zona}
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {mesas
              .filter((m) => (m.zona ?? 'Sin zona') === zona)
              .sort((a, b) => a.numero - b.numero)
              .map((mesa) => {
                const asignacion = asignaciones.get(mesa.id);
                return (
                  <button
                    key={mesa.id}
                    onClick={() => onSelect(mesa)}
                    className={cn(
                      'flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-colors',
                      TILE[mesa.estado],
                    )}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="text-2xl font-semibold text-zinc-900">
                        {mesa.numero}
                      </span>
                      <span className={cn('size-2.5 rounded-full', DOT[mesa.estado])} />
                    </div>
                    <span className="text-xs text-zinc-500">
                      {mesa.capacidad} personas · {MESA_LABEL[mesa.estado]}
                    </span>
                    <span className="flex min-h-4 items-center gap-1 text-xs text-zinc-400">
                      {asignacion && (
                        <>
                          <IconUser className="size-3.5" />
                          {asignacion.usuario.nombre}
                        </>
                      )}
                    </span>
                  </button>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}
