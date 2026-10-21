'use client';

// Cobro de pedidos pendiente_de_cobro: pago mixto (N filas medio+monto → un
// POST /finanzas/pagos por fila), propina separada, pagos ya registrados con
// estado de cobro externo cuando tienen referenciaExterna, e inicio de cobro
// online (POST /pagos/cobros) para pedidos del canal virtual.
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Canal,
  EVENTS,
  MedioPago,
  type PagoConfirmadoEvent,
  type PedidoDto,
} from '@resto-huma/shared';
import { api, ApiError } from '@/lib/api';
import { formatArs, formatTime } from '@/lib/format';
import { getSocket } from '@/lib/socket';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { EstadoCobroBadge } from './estado-cobro-badge';
import { PedidoItems } from './pedido-items';
import {
  MEDIO_PAGO_LABEL,
  SUBTIPO_LABEL,
  pagosVigentes,
  shortId,
  totalPedidoArs,
  type IniciarCobroResult,
  type PagoRow,
  type RegistrarPagoResult,
} from './types';
import { useCatalogo } from './use-catalogo';

const MEDIOS = Object.keys(MedioPago) as MedioPago[];

interface FilaPago {
  key: number;
  medioPago: MedioPago;
  montoArs: string;
}

let filaKey = 0;
const nuevaFila = (montoArs = ''): FilaPago => ({
  key: ++filaKey,
  medioPago: 'efectivo',
  montoArs,
});

function parseEntero(value: string): number | null {
  const n = Number.parseInt(value, 10);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

const selectClass =
  'h-9 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-1';

function CobroForm({
  pedido,
  pagos,
  cajaAbierta,
  onPagosRegistrados,
  onCobrado,
}: {
  pedido: PedidoDto;
  pagos: PagoRow[];
  cajaAbierta: boolean;
  /** totalArs/pagadoArs/restanteArs autoritativos tras registrar pagos. */
  onPagosRegistrados: (estado: RegistrarPagoResult) => void;
  onCobrado: () => void;
}) {
  const vigentes = pagosVigentes(pagos);
  const pagadoArs = vigentes.reduce((a, p) => a + p.montoArs, 0);
  const totalArs = totalPedidoArs(pedido);
  const restanteArs = Math.max(0, totalArs - pagadoArs);

  const [filas, setFilas] = useState<FilaPago[]>([nuevaFila(String(restanteArs))]);
  const [propina, setPropina] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cobroOnline, setCobroOnline] = useState<IniciarCobroResult | null>(null);

  const sumaFilas = filas.reduce((a, f) => a + (parseEntero(f.montoArs) ?? 0), 0);
  const propinaArs = propina.trim() === '' ? 0 : parseEntero(propina);

  const setFila = (key: number, patch: Partial<FilaPago>) =>
    setFilas((fs) => fs.map((f) => (f.key === key ? { ...f, ...patch } : f)));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (propinaArs === null) {
      setError('La propina debe ser un entero en pesos.');
      return;
    }
    const rows = filas.map((f) => ({
      medioPago: f.medioPago,
      montoArs: parseEntero(f.montoArs),
    }));
    if (rows.length === 0 || rows.some((r) => r.montoArs === null || r.montoArs < 1)) {
      setError('Cada fila necesita un monto entero mayor a 0.');
      return;
    }
    if (sumaFilas > restanteArs) {
      setError(`La suma de pagos (${formatArs(sumaFilas)}) supera lo que resta cobrar.`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let ultimo: RegistrarPagoResult | null = null;
      // Propina: va en la primera fila del pago mixto (contrato: 1 propina por Pago).
      for (const [i, row] of rows.entries()) {
        ultimo = await api.post<RegistrarPagoResult>('/finanzas/pagos', {
          pedidoId: pedido.id,
          medioPago: row.medioPago,
          montoArs: row.montoArs,
          ...(i === 0 && propinaArs > 0 ? { propinaArs } : {}),
        });
      }
      setFilas([nuevaFila()]);
      setPropina('');
      if (ultimo) {
        onPagosRegistrados(ultimo);
        if (ultimo.cobrado) onCobrado();
        else setFilas([nuevaFila(String(ultimo.restanteArs))]);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo registrar el cobro.');
    } finally {
      setLoading(false);
    }
  };

  const iniciarCobroOnline = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<IniciarCobroResult>('/pagos/cobros', {
        pedidoId: pedido.id,
        montoArs: restanteArs,
      });
      setCobroOnline(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo iniciar el cobro online.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-zinc-500">
          Cobrado: {formatArs(pagadoArs)} · Resta:{' '}
          <strong className="text-zinc-900">{formatArs(restanteArs)}</strong>
        </span>
        {pedido.canal === Canal.virtual && (
          <Badge tone="blue">{SUBTIPO_LABEL[pedido.subtipo]}</Badge>
        )}
      </div>

      {filas.map((fila, i) => (
        <div key={fila.key} className="flex items-end gap-2">
          <div className="flex-1">
            {i === 0 && <Label>Medio de pago</Label>}
            <select
              className={selectClass}
              value={fila.medioPago}
              onChange={(e) => setFila(fila.key, { medioPago: e.target.value as MedioPago })}
            >
              {MEDIOS.map((m) => (
                <option key={m} value={m}>
                  {MEDIO_PAGO_LABEL[m]}
                </option>
              ))}
            </select>
          </div>
          <div className="w-32">
            {i === 0 && <Label>Monto (ARS)</Label>}
            <Input
              inputMode="numeric"
              min={1}
              step={1}
              type="number"
              value={fila.montoArs}
              onChange={(e) => setFila(fila.key, { montoArs: e.target.value })}
              required
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9"
            disabled={filas.length === 1}
            onClick={() => setFilas((fs) => fs.filter((f) => f.key !== fila.key))}
            title="Quitar fila"
          >
            ✕
          </Button>
        </div>
      ))}

      <div className="flex items-end gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setFilas((fs) => [...fs, nuevaFila()])}
        >
          + Agregar medio (pago mixto)
        </Button>
        <div className="ml-auto w-32">
          <Input
            label="Propina (ARS)"
            inputMode="numeric"
            min={0}
            step={1}
            type="number"
            value={propina}
            onChange={(e) => setPropina(e.target.value)}
            placeholder="0"
          />
        </div>
      </div>

      <p className="text-xs text-zinc-500">
        Total a registrar: <strong>{formatArs(sumaFilas)}</strong>
        {propinaArs ? ` + ${formatArs(propinaArs)} de propina` : ''} · Resta cobrar:{' '}
        {formatArs(restanteArs)}
      </p>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {!cajaAbierta && (
        <p className="text-xs text-amber-700">
          No hay una caja abierta: abrila en la solapa Caja para poder cobrar.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={loading || !cajaAbierta || restanteArs <= 0}>
          {loading ? 'Registrando…' : `Registrar cobro ${formatArs(sumaFilas)}`}
        </Button>
        {pedido.canal === Canal.virtual && restanteArs > 0 && (
          <Button
            type="button"
            variant="secondary"
            disabled={loading}
            onClick={iniciarCobroOnline}
          >
            Iniciar cobro online
          </Button>
        )}
      </div>

      {cobroOnline && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600">
          <span>
            Cobro online · ref <code>{cobroOnline.referenciaExterna}</code>
          </span>
          <EstadoCobroBadge
            referenciaExterna={cobroOnline.referenciaExterna}
            onChange={(estado) => {
              if (estado === 'aprobado') onCobrado();
            }}
          />
          {cobroOnline.checkoutUrl && (
            <a
              href={cobroOnline.checkoutUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sky-700 underline underline-offset-2"
            >
              Abrir checkout
            </a>
          )}
        </div>
      )}
    </form>
  );
}

function PagosRegistrados({ pagos }: { pagos: PagoRow[] }) {
  if (pagos.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-zinc-500">Pagos registrados</p>
      <ul className="flex flex-col gap-1.5">
        {pagos.map((p) => (
          <li
            key={p.id}
            className="flex flex-wrap items-center gap-2 text-sm text-zinc-700"
          >
            <span className="font-medium">{formatArs(p.montoArs)}</span>
            <span className="text-zinc-500">{MEDIO_PAGO_LABEL[p.medioPago]}</span>
            {p.propinaArs > 0 && (
              <span className="text-zinc-400">+{formatArs(p.propinaArs)} propina</span>
            )}
            <span className="text-xs text-zinc-400">{formatTime(p.createdAt)}</span>
            {p.anulaciones.length > 0 && <Badge tone="red">Anulado</Badge>}
            {p.referenciaExterna && p.anulaciones.length === 0 && (
              <EstadoCobroBadge referenciaExterna={p.referenciaExterna} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CobrosPanel({
  cajaAbierta,
  onMovimiento,
}: {
  cajaAbierta: boolean;
  /** Aviso al padre para refrescar el resumen de caja tras un cobro. */
  onMovimiento: () => void;
}) {
  const catalogo = useCatalogo();
  const [pedidos, setPedidos] = useState<PedidoDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  // Pagos y total autoritativo quedan atados al pedido que los originó:
  // al cambiar de selección no hace falta resetear estado en un effect.
  const [pagosSel, setPagosSel] = useState<{ pedidoId: string; lista: PagoRow[] } | null>(null);
  const [totalSel, setTotalSel] = useState<{ pedidoId: string; totalArs: number } | null>(null);

  const cargar = useCallback(() => {
    // NOTA: el backend aún no filtra por estadoPago (ListarPedidosQueryDto lo
    // descarta por whitelist) — el parámetro queda para cuando lo soporte y el
    // filtrado real es client-side.
    api
      .get<PedidoDto[]>('/pedidos?estadoPago=pendiente_de_cobro')
      .then((lista) =>
        setPedidos(
          lista.filter(
            (p) => p.estadoPago === 'pendiente_de_cobro' && p.estadoAtencion !== 'cancelado',
          ),
        ),
      )
      .catch(() => setError('No se pudieron cargar los pedidos.'));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Cobro confirmado por pasarela (webhook externa): sacar el pedido de la cola.
  useEffect(() => {
    const socket = getSocket();
    const onPago = (e: PagoConfirmadoEvent) => {
      setPedidos((ps) => ps?.filter((p) => p.id !== e.pedidoId) ?? ps);
      setSeleccionadoId((sel) => (sel === e.pedidoId ? null : sel));
    };
    socket.on(EVENTS.pagoConfirmado, onPago);
    return () => {
      socket.off(EVENTS.pagoConfirmado, onPago);
    };
  }, []);

  const seleccionado = useMemo(
    () => pedidos?.find((p) => p.id === seleccionadoId) ?? null,
    [pedidos, seleccionadoId],
  );

  const cargarPagos = useCallback((pedidoId: string) => {
    api
      .get<PagoRow[]>(`/finanzas/pagos?pedidoId=${encodeURIComponent(pedidoId)}`)
      .then((lista) => setPagosSel({ pedidoId, lista }))
      .catch(() => setPagosSel({ pedidoId, lista: [] }));
  }, []);

  useEffect(() => {
    if (seleccionadoId) cargarPagos(seleccionadoId);
  }, [seleccionadoId, cargarPagos]);

  const pagos = pagosSel?.pedidoId === seleccionadoId ? pagosSel.lista : [];
  const totalOverride = totalSel?.pedidoId === seleccionadoId ? totalSel.totalArs : null;

  const marcarCobrado = useCallback(
    (pedidoId: string) => {
      setPedidos((ps) => ps?.filter((p) => p.id !== pedidoId) ?? ps);
      setSeleccionadoId((sel) => (sel === pedidoId ? null : sel));
      onMovimiento();
    },
    [onMovimiento],
  );

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Pedidos por cobrar</CardTitle>
          <CardDescription>Pendientes de cobro en el turno</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {error && <p className="px-5 pb-3 text-xs text-red-600">{error}</p>}
          {pedidos === null && !error && (
            <p className="px-5 pb-4 text-sm text-zinc-400">Cargando…</p>
          )}
          {pedidos?.length === 0 && (
            <p className="px-5 pb-4 text-sm text-zinc-400">No hay pedidos pendientes de cobro.</p>
          )}
          <ul className="divide-y divide-zinc-100">
            {pedidos?.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setSeleccionadoId(p.id)}
                  className={`flex w-full items-center justify-between gap-2 px-5 py-3 text-left text-sm transition-colors hover:bg-zinc-50 ${
                    seleccionadoId === p.id ? 'bg-zinc-50' : ''
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="font-medium text-zinc-900">{shortId(p.id)}</span>
                    <Badge tone={p.canal === 'virtual' ? 'blue' : 'neutral'}>
                      {SUBTIPO_LABEL[p.subtipo]}
                    </Badge>
                    <span className="text-xs text-zinc-400">{formatTime(p.createdAt)}</span>
                  </span>
                  <span className="font-medium text-zinc-900">
                    {formatArs(totalPedidoArs(p))}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {pedidos && pedidos.length > 0 && (
            <div className="border-t border-zinc-100 p-3">
              <Button variant="ghost" size="sm" onClick={cargar}>
                Actualizar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>
            {seleccionado ? `Cobro del pedido ${shortId(seleccionado.id)}` : 'Detalle del cobro'}
          </CardTitle>
          <CardDescription>
            {seleccionado
              ? 'Registrá uno o varios pagos hasta cubrir el total.'
              : 'Elegí un pedido de la lista.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {seleccionado && (
            <>
              <PedidoItems pedido={seleccionado} catalogo={catalogo} totalOverride={totalOverride ?? undefined} />
              <PagosRegistrados pagos={pagos} />
              <div className="border-t border-zinc-100 pt-4">
                <CobroForm
                  key={seleccionado.id}
                  pedido={seleccionado}
                  pagos={pagos}
                  cajaAbierta={cajaAbierta}
                  onPagosRegistrados={(res) => {
                    setTotalSel({ pedidoId: seleccionado.id, totalArs: res.totalArs });
                    cargarPagos(seleccionado.id);
                    onMovimiento();
                  }}
                  onCobrado={() => marcarCobrado(seleccionado.id)}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
