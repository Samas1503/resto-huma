'use client';

// Home del dashboard: resumen por módulo (placeholders hasta que los workers
// C2–C8 implementen sus vistas) + estado real de la caja (GET /caja/actual).
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { EstadoCaja, TipoTurno } from '@resto-huma/shared';
import { api, ApiError } from '@/lib/api';
import { formatArs, formatTime } from '@/lib/format';
import { useRequireRol } from '@/lib/use-require-rol';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { IconChevronRight } from '@/components/ui/icons';

// Espejo del payload de GET /caja/actual (caja.service.ts → prisma.caja.findFirst).
interface CajaActual {
  id: string;
  estado: EstadoCaja;
  montoInicialArs: number;
  apertura: string;
  turno: { id: string; tipo: TipoTurno; apertura: string; cierre: string | null };
  abiertaPor: { id: string; nombre: string };
}

type CajaState =
  | { kind: 'loading' }
  | { kind: 'open'; caja: CajaActual }
  | { kind: 'closed' }
  | { kind: 'forbidden' }
  | { kind: 'error' };

const MODULOS = [
  { label: 'Ventas / Pedidos', href: '/pedidos', descripcion: 'Pedidos del turno y ventas cobradas' },
  { label: 'Salón', href: '/salon', descripcion: 'Mapa de mesas, cuentas y reservas' },
  { label: 'Cocina', href: '/cocina', descripcion: 'Comandas en tiempo real' },
  { label: 'Caja', href: '/caja', descripcion: 'Cobros, egresos y cierre' },
  { label: 'Reparto', href: '/reparto', descripcion: 'Entregas de delivery' },
  { label: 'Menú / Admin', href: '/admin', descripcion: 'Carta, insumos, usuarios y promos' },
  { label: 'Reportes', href: '/reportes', descripcion: 'Ventas, productos y costos' },
];

function EstadoCajaCard() {
  const [state, setState] = useState<CajaState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    api
      .get<CajaActual | null>('/caja/actual')
      .then((caja) => !cancelled && setState(caja ? { kind: 'open', caja } : { kind: 'closed' }))
      .catch((err: unknown) => {
        if (cancelled) return;
        setState(err instanceof ApiError && err.status === 403 ? { kind: 'forbidden' } : { kind: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Estado de la caja</CardTitle>
        <CardDescription>Sesión de dinero del turno actual</CardDescription>
      </CardHeader>
      <CardContent>
        {state.kind === 'loading' && <p className="text-sm text-zinc-400">Consultando…</p>}
        {state.kind === 'closed' && (
          <div className="flex items-center gap-2">
            <Badge tone="amber">Sin caja abierta</Badge>
            <span className="text-sm text-zinc-500">Abrila desde el módulo Caja.</span>
          </div>
        )}
        {state.kind === 'forbidden' && (
          <p className="text-sm text-zinc-500">Tu rol no tiene acceso al detalle de caja.</p>
        )}
        {state.kind === 'error' && (
          <p className="text-sm text-zinc-500">No se pudo consultar la API.</p>
        )}
        {state.kind === 'open' && (
          <div className="flex flex-col gap-2">
            <Badge tone="green" className="w-fit">Abierta</Badge>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <dt className="text-zinc-500">Monto inicial</dt>
              <dd className="font-medium text-zinc-900">{formatArs(state.caja.montoInicialArs)}</dd>
              <dt className="text-zinc-500">Turno</dt>
              <dd className="font-medium text-zinc-900 capitalize">{state.caja.turno.tipo}</dd>
              <dt className="text-zinc-500">Abierta por</dt>
              <dd className="font-medium text-zinc-900">{state.caja.abiertaPor.nombre}</dd>
              <dt className="text-zinc-500">Apertura</dt>
              <dd className="font-medium text-zinc-900">{formatTime(state.caja.apertura)}</dd>
            </dl>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { session } = useRequireRol();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
          Hola{session ? `, ${session.email}` : ''}
        </h1>
        <p className="text-sm text-zinc-500">Resumen de la operación del local.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <EstadoCajaCard />
        <Card>
          <CardHeader>
            <CardTitle>Pedidos activos</CardTitle>
            <CardDescription>En atención ahora mismo</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-zinc-300">—</p>
            <p className="text-xs text-zinc-400">Disponible con el módulo de pedidos.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Mesas ocupadas</CardTitle>
            <CardDescription>Ocupación del salón</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-zinc-300">—</p>
            <p className="text-xs text-zinc-400">Disponible con el módulo de salón.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {MODULOS.map((mod) => (
          <Link key={mod.href} href={mod.href} className="group">
            <Card className="h-full transition-colors group-hover:border-zinc-300 group-hover:shadow">
              <CardContent className="flex items-center justify-between gap-2 pt-5">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">{mod.label}</p>
                  <p className="mt-1 text-xs text-zinc-500">{mod.descripcion}</p>
                </div>
                <IconChevronRight className="size-4 text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-500" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
