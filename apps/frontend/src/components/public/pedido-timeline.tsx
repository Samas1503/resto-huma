'use client';

// Timeline vertical del estadoAtencion de un pedido virtual. Delivery incluye
// el paso en_reparto entre listo y entregado (GLOSARIO.MD).
import type { EstadoAtencion, Subtipo } from '@resto-huma/shared';
import { cn } from '@/lib/utils';
import { ESTADO_LABELS, ESTADO_ORDEN } from './types';

export function PedidoTimeline({
  estado,
  subtipo,
}: {
  estado: EstadoAtencion;
  subtipo: Subtipo;
}) {
  const pasos = ESTADO_ORDEN.filter((e) => e !== 'en_reparto' || subtipo === 'delivery');

  if (estado === 'cancelado') {
    return (
      <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 ring-1 ring-inset ring-red-200">
        Este pedido fue cancelado. Si tenés dudas, comunicate con el local.
      </div>
    );
  }

  const idxActual = pasos.indexOf(estado);

  return (
    <ol className="flex flex-col">
      {pasos.map((paso, idx) => {
        const done = idx < idxActual;
        const current = idx === idxActual;
        return (
          <li key={paso} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-2 ring-inset',
                  done && 'bg-emerald-600 text-white ring-emerald-600',
                  current && 'bg-orange-800 text-amber-50 ring-orange-800',
                  !done && !current && 'bg-amber-100 text-stone-400 ring-amber-200',
                )}
              >
                {done ? (
                  <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                ) : (
                  idx + 1
                )}
              </span>
              {idx < pasos.length - 1 && (
                <span
                  className={cn(
                    'w-0.5 flex-1',
                    done ? 'bg-emerald-500' : 'bg-amber-200',
                  )}
                />
              )}
            </div>
            <div className="pb-6 pt-1">
              <p
                className={cn(
                  'text-sm font-semibold',
                  current ? 'text-orange-900' : done ? 'text-stone-700' : 'text-stone-400',
                )}
              >
                {ESTADO_LABELS[paso]}
              </p>
              {current && paso === 'pendiente' && (
                <p className="mt-0.5 text-xs text-stone-500">
                  Esperando confirmación del local
                </p>
              )}
              {current && paso === 'listo' && (
                <p className="mt-0.5 text-xs text-stone-500">
                  {subtipo === 'takeaway' ? 'Ya podés pasar a retirarlo' : 'Sale para reparto en breve'}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
