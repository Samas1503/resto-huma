'use client';

// Estado de la caja: apertura (si está cerrada), resumen del turno y cierre
// con conciliación (diferencia entre dinero físico contado y esperado).
import { useCallback, useEffect, useState } from 'react';
import { EVENTS } from '@resto-huma/shared';
import { api, ApiError } from '@/lib/api';
import { formatArs, formatDateTime, formatTime } from '@/lib/format';
import { getSocket } from '@/lib/socket';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  CATEGORIA_EGRESO_LABEL,
  MEDIO_PAGO_LABEL,
  type CajaActual,
  type CierreCajaResult,
  type ResumenCaja,
} from './types';

function parseMonto(value: string): number | null {
  const n = Number.parseInt(value, 10);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

function AbrirCajaForm({ onAbierta }: { onAbierta: () => void }) {
  const [monto, setMonto] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const montoInicialArs = parseMonto(monto);
    if (montoInicialArs === null) {
      setError('Ingresá un monto inicial en pesos (entero).');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.post('/caja/abrir', { montoInicialArs });
      onAbierta();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo abrir la caja.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Abrir caja</CardTitle>
        <CardDescription>
          No hay una caja abierta. Registrá el fondo inicial del turno.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex max-w-sm flex-col gap-3">
          <Input
            label="Monto inicial (ARS)"
            inputMode="numeric"
            min={0}
            step={1}
            type="number"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="Ej.: 20000"
            required
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <Button type="submit" disabled={loading} className="w-fit">
            {loading ? 'Abriendo…' : 'Abrir caja'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function CierreResultado({ cierre }: { cierre: CierreCajaResult }) {
  const ok = cierre.diferenciaArs === 0;
  return (
    <Card className="border-emerald-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Caja cerrada
          <Badge tone={ok ? 'green' : 'amber'}>
            {ok ? 'Sin diferencia' : 'Con diferencia'}
          </Badge>
        </CardTitle>
        <CardDescription>{formatDateTime(cierre.createdAt)}</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid max-w-md grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-zinc-500">Ingresos esperados (efectivo)</dt>
          <dd className="text-right font-medium text-zinc-900">
            {formatArs(cierre.ingresosEsperadosArs)}
          </dd>
          <dt className="text-zinc-500">Egresos esperados</dt>
          <dd className="text-right font-medium text-zinc-900">
            {formatArs(cierre.egresosEsperadosArs)}
          </dd>
          <dt className="text-zinc-500">Dinero físico contado</dt>
          <dd className="text-right font-medium text-zinc-900">
            {formatArs(cierre.dineroFisicoArs)}
          </dd>
          <dt className="text-zinc-500">Diferencia</dt>
          <dd
            className={`text-right font-semibold ${
              ok ? 'text-emerald-700' : 'text-amber-700'
            }`}
          >
            {cierre.diferenciaArs > 0 ? '+' : ''}
            {formatArs(cierre.diferenciaArs)}
          </dd>
        </dl>
      </CardContent>
    </Card>
  );
}

function ResumenAbierta({
  caja,
  resumen,
  onCerrada,
}: {
  caja: CajaActual;
  resumen: ResumenCaja | null;
  onCerrada: (cierre: CierreCajaResult) => void;
}) {
  const [dinero, setDinero] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const cerrar = async (e: React.FormEvent) => {
    e.preventDefault();
    const dineroFisicoArs = parseMonto(dinero);
    if (dineroFisicoArs === null) {
      setError('Ingresá el dinero físico contado (entero).');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const cierre = await api.post<CierreCajaResult>('/caja/cerrar', { dineroFisicoArs });
      onCerrada(cierre);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cerrar la caja.');
    } finally {
      setLoading(false);
    }
  };

  const porMedio = Object.entries(resumen?.ingresos.porMedio ?? {}) as [
    keyof typeof MEDIO_PAGO_LABEL,
    number,
  ][];
  const porCategoria = Object.entries(resumen?.egresos.porCategoria ?? {}) as [
    keyof typeof CATEGORIA_EGRESO_LABEL,
    number,
  ][];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Caja abierta <Badge tone="green">Turno {caja.turno.tipo}</Badge>
          </CardTitle>
          <CardDescription>
            Abierta por {caja.abiertaPor.nombre} a las {formatTime(caja.apertura)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {resumen ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-zinc-500">Monto inicial</dt>
              <dd className="text-right font-medium text-zinc-900">
                {formatArs(caja.montoInicialArs)}
              </dd>
              <dt className="text-zinc-500">Ingresos ({resumen.ingresos.cantidadPagos} pagos)</dt>
              <dd className="text-right font-medium text-zinc-900">
                {formatArs(resumen.ingresos.totalArs)}
              </dd>
              {porMedio.map(([medio, monto]) => (
                <div key={medio} className="contents">
                  <dt className="pl-3 text-zinc-400">· {MEDIO_PAGO_LABEL[medio]}</dt>
                  <dd className="text-right text-zinc-600">{formatArs(monto)}</dd>
                </div>
              ))}
              <dt className="text-zinc-500">Propinas</dt>
              <dd className="text-right font-medium text-zinc-900">
                {formatArs(resumen.ingresos.propinasArs)}
              </dd>
              <dt className="text-zinc-500">Egresos ({resumen.egresos.cantidad})</dt>
              <dd className="text-right font-medium text-zinc-900">
                −{formatArs(resumen.egresos.totalArs)}
              </dd>
              {porCategoria.map(([cat, monto]) => (
                <div key={cat} className="contents">
                  <dt className="pl-3 text-zinc-400">· {CATEGORIA_EGRESO_LABEL[cat]}</dt>
                  <dd className="text-right text-zinc-600">{formatArs(monto)}</dd>
                </div>
              ))}
              <dt className="border-t border-zinc-100 pt-2 font-medium text-zinc-900">
                Efectivo esperado en cajón
              </dt>
              <dd className="border-t border-zinc-100 pt-2 text-right font-semibold text-zinc-900">
                {formatArs(resumen.esperadoEfectivoArs)}
              </dd>
            </dl>
          ) : (
            <p className="text-sm text-zinc-400">Cargando resumen…</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cerrar caja</CardTitle>
          <CardDescription>
            Contá el efectivo del cajón. El sistema concilia contra lo esperado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {confirmando ? (
            <form onSubmit={cerrar} className="flex max-w-sm flex-col gap-3">
              <Input
                label="Dinero físico contado (ARS)"
                inputMode="numeric"
                min={0}
                step={1}
                type="number"
                value={dinero}
                onChange={(e) => setDinero(e.target.value)}
                placeholder="Ej.: 157500"
                required
                autoFocus
              />
              {resumen && (
                <p className="text-xs text-zinc-500">
                  Esperado en cajón: <strong>{formatArs(resumen.esperadoEfectivoArs)}</strong>
                </p>
              )}
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" variant="danger" disabled={loading}>
                  {loading ? 'Cerrando…' : 'Confirmar cierre'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setConfirmando(false)}>
                  Volver
                </Button>
              </div>
            </form>
          ) : (
            <Button variant="danger" onClick={() => setConfirmando(true)}>
              Iniciar cierre de caja
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function CajaPanel({
  caja,
  onChanged,
  resumenVersion,
}: {
  /** null = sin caja abierta. */
  caja: CajaActual | null;
  /** Recargar /caja/actual tras abrir o cerrar. */
  onChanged: () => void;
  /** Se incrementa cuando otra solapa registra cobros/egresos: fuerza refetch del resumen. */
  resumenVersion: number;
}) {
  // Resumen asociado a la caja.id que lo pidió: si la caja cambia (cierre +
  // reapertura), un resumen viejo no se muestra por error.
  const [resumen, setResumen] = useState<{ cajaId: string; data: ResumenCaja } | null>(null);
  const [ultimoCierre, setUltimoCierre] = useState<CierreCajaResult | null>(null);

  const cargarResumen = useCallback(() => {
    if (!caja) return;
    api
      .get<ResumenCaja>(`/caja/${caja.id}/resumen`)
      .then((data) => setResumen({ cajaId: caja.id, data }))
      .catch(() => {});
  }, [caja]);

  useEffect(() => {
    cargarResumen();
  }, [cargarResumen, resumenVersion]);

  // Un cobro online confirmado por webhook mueve el resumen sin tocar la UI.
  useEffect(() => {
    if (!caja) return;
    const socket = getSocket();
    const onPago = () => cargarResumen();
    socket.on(EVENTS.pagoConfirmado, onPago);
    return () => {
      socket.off(EVENTS.pagoConfirmado, onPago);
    };
  }, [caja, cargarResumen]);

  return (
    <div className="flex flex-col gap-4">
      {ultimoCierre && <CierreResultado cierre={ultimoCierre} />}
      {caja ? (
        <ResumenAbierta
          caja={caja}
          resumen={resumen?.cajaId === caja.id ? resumen.data : null}
          onCerrada={(cierre) => {
            setUltimoCierre(cierre);
            onChanged();
          }}
        />
      ) : (
        <AbrirCajaForm onAbierta={onChanged} />
      )}
    </div>
  );
}
