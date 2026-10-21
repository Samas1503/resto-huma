'use client';

// Módulo Caja (C4): estado/apertura/cierre de caja, cobro de pedidos
// (pago mixto + propina + cobros online por pasarela), bandeja de pedidos
// virtuales y egresos. Acceso: cajero y admin.
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { RoleGuard } from '@/components/ui/role-guard';
import { BandejaPanel } from '@/components/caja/bandeja-panel';
import { CajaPanel } from '@/components/caja/caja-panel';
import { CobrosPanel } from '@/components/caja/cobros-panel';
import { EgresosPanel } from '@/components/caja/egresos-panel';
import type { CajaActual } from '@/components/caja/types';

type Tab = 'caja' | 'cobros' | 'virtuales' | 'egresos';

const TABS: { id: Tab; label: string }[] = [
  { id: 'caja', label: 'Caja' },
  { id: 'cobros', label: 'Cobros' },
  { id: 'virtuales', label: 'Pedidos virtuales' },
  { id: 'egresos', label: 'Egresos' },
];

function CajaView() {
  const [tab, setTab] = useState<Tab>('caja');
  const [caja, setCaja] = useState<CajaActual | null>(null);
  const [cajaCargada, setCajaCargada] = useState(false);
  const [cajaError, setCajaError] = useState(false);
  // Se incrementa tras cada cobro/egreso: el resumen de la caja se refetchea.
  const [resumenVersion, setResumenVersion] = useState(0);
  const [bandejaCount, setBandejaCount] = useState(0);

  const recargarCaja = useCallback(() => {
    api
      .get<CajaActual | null>('/caja/actual')
      .then((c) => {
        setCaja(c);
        setCajaError(false);
      })
      .catch(() => setCajaError(true))
      .finally(() => setCajaCargada(true));
  }, []);

  useEffect(() => {
    recargarCaja();
  }, [recargarCaja]);

  const onMovimiento = useCallback(() => setResumenVersion((v) => v + 1), []);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900">Caja</h1>
        <p className="text-sm text-zinc-500">
          Cobros, pedidos virtuales, egresos y cierre del turno.
        </p>
      </div>

      <div className="flex gap-1 border-b border-zinc-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'rounded-t-lg px-4 py-2 text-sm font-medium transition-colors',
              tab === t.id
                ? 'border-b-2 border-zinc-900 text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-800',
            )}
          >
            {t.label}
            {t.id === 'virtuales' && bandejaCount > 0 && (
              <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-sky-100 px-1.5 py-0.5 text-xs font-semibold text-sky-700">
                {bandejaCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Todos montados (ocultos por CSS): mantiene vivas las suscripciones WS
          y el estado de cada solapa entre cambios de tab. */}
      {!cajaCargada ? (
        <p className="text-sm text-zinc-400">Consultando estado de la caja…</p>
      ) : cajaError ? (
        <div className="flex items-center gap-3 text-sm text-zinc-500">
          <span>No se pudo consultar el estado de la caja.</span>
          <button
            type="button"
            onClick={recargarCaja}
            className="text-zinc-700 underline underline-offset-2 hover:text-zinc-900"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <>
          <div className={cn(tab !== 'caja' && 'hidden')}>
            <CajaPanel caja={caja} onChanged={recargarCaja} resumenVersion={resumenVersion} />
          </div>
          <div className={cn(tab !== 'cobros' && 'hidden')}>
            <CobrosPanel cajaAbierta={caja !== null} onMovimiento={onMovimiento} />
          </div>
          <div className={cn(tab !== 'virtuales' && 'hidden')}>
            <BandejaPanel onCountChange={setBandejaCount} />
          </div>
          <div className={cn(tab !== 'egresos' && 'hidden')}>
            <EgresosPanel cajaId={caja?.id ?? null} onMovimiento={onMovimiento} />
          </div>
        </>
      )}
    </div>
  );
}

export default function CajaPage() {
  return (
    <RoleGuard roles={['cajero', 'admin']}>
      <CajaView />
    </RoleGuard>
  );
}
