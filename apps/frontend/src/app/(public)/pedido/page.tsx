'use client';

// /pedido — checkout del pedido virtual: takeaway o delivery (dirección nueva
// o del perfil si está logueado) → POST /pedidos {canal:'virtual', …} →
// pantalla "pedido recibido, esperando confirmación" con link al seguimiento.
import Link from 'next/link';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type {
  ClienteDto,
  CrearPedidoDto,
  DireccionDto,
  ItemPedidoInput,
  PedidoDto,
  Subtipo,
} from '@resto-huma/shared';
import { ApiError } from '@/lib/api';
import { formatArs } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useCart } from '@/components/public/cart';
import { useClienteSession } from '@/components/public/cliente-session';
import { GoogleLogin } from '@/components/public/google-login';
import { publicApi } from '@/components/public/public-api';
import { PRESENTACION_LABELS } from '@/components/public/types';
import { setUltimoPedido } from '@/components/public/ultimo-pedido';

const inputCls =
  'h-11 w-full rounded-xl bg-white px-3 text-sm text-orange-950 ring-1 ring-inset ring-amber-200 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-600';
const labelCls = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500';

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <input className={inputCls} {...props} />
    </div>
  );
}

// Snapshot del checkout: delivery se arma como "calle, ciudad (referencia)".
function direccionSnapshot(dir: { calle: string; ciudad: string; referencia: string }): string {
  return [dir.calle, dir.ciudad, dir.referencia].filter(Boolean).join(', ');
}

export default function CheckoutPage() {
  const { items, totalArs, count, updateCantidad, removeItem, clear } = useCart();
  const { session } = useClienteSession();

  const [subtipo, setSubtipo] = useState<Subtipo>('takeaway');
  const [perfil, setPerfil] = useState<ClienteDto | null>(null);
  const [direccionIdx, setDireccionIdx] = useState<number | 'nueva'>('nueva');
  const [dirNueva, setDirNueva] = useState({ calle: '', ciudad: '', referencia: '' });
  const [guest, setGuest] = useState({ nombre: '', telefono: '' });
  const [estado, setEstado] = useState<'form' | 'enviando' | 'recibido'>('form');
  const [pedidoId, setPedidoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Perfil del cliente logueado (direcciones guardadas para delivery).
  // Se consulta solo cuando hay sesión; sin sesión `direcciones` queda vacío.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    publicApi
      .get<ClienteDto>('/clientes/me')
      .then((p) => {
        if (cancelled) return;
        setPerfil(p);
        if (p.direcciones.length > 0) setDireccionIdx(0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [session]);

  const direcciones = useMemo(
    () => (session ? (perfil?.direcciones ?? []) : []),
    [session, perfil],
  );

  const direccionElegida = useMemo((): string | undefined => {
    if (subtipo !== 'delivery') return undefined;
    const base =
      direccionIdx === 'nueva'
        ? direccionSnapshot(dirNueva)
        : direccionSnapshot({
            calle: direcciones[direccionIdx]?.calle ?? '',
            ciudad: direcciones[direccionIdx]?.ciudad ?? '',
            referencia: direcciones[direccionIdx]?.referencia ?? '',
          });
    // El pedido no tiene campo de contacto de invitado (ver pendientes):
    // en delivery va embebido en el snapshot para que el repartidor lo vea.
    if (!session && guest.nombre) {
      return `${base} — ${guest.nombre}${guest.telefono ? ` (tel. ${guest.telefono})` : ''}`;
    }
    return base;
  }, [subtipo, direccionIdx, direcciones, dirNueva, session, guest]);

  const valido = useMemo(() => {
    if (items.length === 0) return false;
    if (!session && (!guest.nombre.trim() || !guest.telefono.trim())) return false;
    if (subtipo === 'delivery') {
      if (direccionIdx === 'nueva' && (!dirNueva.calle.trim() || !dirNueva.ciudad.trim())) {
        return false;
      }
      if (direccionIdx !== 'nueva' && !direcciones[direccionIdx]) return false;
    }
    return true;
  }, [items, session, guest, subtipo, direccionIdx, dirNueva, direcciones]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valido) return;
    setError(null);
    setEstado('enviando');

    const itemsInput: ItemPedidoInput[] = items.map((i) => ({
      productoId: i.productoId,
      variedadId: i.variedadId,
      cantidad: i.cantidad,
      presentacion: i.presentacion,
      notas: i.notas,
    }));
    // Invitado + takeaway: el DTO no tiene campo de contacto; se anota en el
    // primer ítem para que el local sepa quién retira (pendiente: campo propio).
    if (!session && subtipo === 'takeaway' && itemsInput[0]) {
      const contacto = `Para: ${guest.nombre.trim()} — tel. ${guest.telefono.trim()}`;
      itemsInput[0].notas = itemsInput[0].notas ? `${contacto} · ${itemsInput[0].notas}` : contacto;
    }

    const dto: CrearPedidoDto = {
      canal: 'virtual',
      subtipo,
      clienteId: session?.clienteId,
      direccionSnapshot: direccionElegida,
      items: itemsInput,
    };

    try {
      const pedido = await publicApi.post<PedidoDto>('/pedidos', dto);
      setPedidoId(pedido.id);
      setUltimoPedido(pedido.id);
      clear();
      setEstado('recibido');
    } catch (err) {
      setEstado('form');
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setError(
          'El pedido online todavía no está habilitado en el servidor (requiere el alta de clientes en la API).',
        );
      } else {
        setError(
          err instanceof ApiError
            ? err.message
            : 'No pudimos enviar tu pedido. Revisá tu conexión e intentá de nuevo.',
        );
      }
    }
  };

  if (estado === 'recibido' && pedidoId) {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100">
          <svg viewBox="0 0 24 24" className="size-8 text-emerald-700" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-orange-950">¡Pedido recibido!</h1>
        <p className="max-w-xs text-sm text-stone-600">
          Tu pedido está esperando la confirmación del local. Te avisamos cuando
          empiece a prepararse.
        </p>
        <Link
          href={`/pedido/${pedidoId}`}
          className="flex h-11 items-center rounded-xl bg-orange-800 px-6 text-sm font-bold text-amber-50 transition-colors hover:bg-orange-700"
        >
          Seguir mi pedido
        </Link>
        <Link href="/carta" className="text-sm font-medium text-stone-500 underline-offset-2 hover:underline">
          Volver a la carta
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-orange-950">Confirmar pedido</h1>
        <p className="text-sm text-stone-500">Revisá tu pedido y elegí cómo lo recibís.</p>
      </div>

      {/* Resumen del carrito */}
      <section className="rounded-2xl bg-white p-4 ring-1 ring-inset ring-amber-200/70">
        <h2 className="mb-3 text-sm font-bold text-orange-950">Tu pedido</h2>
        {items.length === 0 ? (
          <div className="py-4 text-center">
            <p className="text-sm text-stone-500">Todavía no agregaste nada.</p>
            <Link href="/carta" className="mt-2 inline-block text-sm font-semibold text-orange-800 underline-offset-2 hover:underline">
              Ir a la carta
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <li key={item.key} className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-orange-950">
                    {item.variedadNombre ?? item.nombre}
                  </p>
                  <p className="text-xs text-stone-500">
                    {PRESENTACION_LABELS[item.presentacion]}
                    {item.notas && ` · “${item.notas}”`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => updateCantidad(item.key, -1)} className="flex size-7 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-orange-900">
                    −
                  </button>
                  <span className="w-4 text-center text-sm font-bold">{item.cantidad}</span>
                  <button type="button" onClick={() => updateCantidad(item.key, 1)} className="flex size-7 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-orange-900">
                    +
                  </button>
                  <span className="w-20 text-right text-sm font-bold text-orange-950">
                    {formatArs(item.precioArs * item.cantidad)}
                  </span>
                  <button type="button" onClick={() => removeItem(item.key)} aria-label="Quitar" className="text-stone-400 hover:text-red-700">
                    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {items.length > 0 && (
        <>
          {/* Entrega */}
          <section className="rounded-2xl bg-white p-4 ring-1 ring-inset ring-amber-200/70">
            <h2 className="mb-3 text-sm font-bold text-orange-950">¿Cómo lo recibís?</h2>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: 'takeaway' as const, label: 'Retiro en el local' },
                  { id: 'delivery' as const, label: 'Delivery' },
                ]
              ).map((op) => (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => setSubtipo(op.id)}
                  className={cn(
                    'rounded-xl px-3 py-3 text-sm font-semibold ring-1 ring-inset transition-colors',
                    subtipo === op.id
                      ? 'bg-orange-800 text-amber-50 ring-orange-800'
                      : 'bg-amber-50 text-stone-600 ring-amber-200 hover:bg-amber-100',
                  )}
                >
                  {op.label}
                </button>
              ))}
            </div>

            {subtipo === 'delivery' && (
              <div className="mt-4 flex flex-col gap-3">
                {direcciones.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {direcciones.map((dir: DireccionDto, idx) => (
                      <label
                        key={idx}
                        className={cn(
                          'flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm ring-1 ring-inset',
                          direccionIdx === idx
                            ? 'bg-amber-100/70 font-medium text-orange-950 ring-amber-400'
                            : 'bg-amber-50 text-stone-600 ring-amber-200',
                        )}
                      >
                        <input
                          type="radio"
                          name="direccion"
                          checked={direccionIdx === idx}
                          onChange={() => setDireccionIdx(idx)}
                          className="accent-orange-800"
                        />
                        {direccionSnapshot({
                          calle: dir.calle,
                          ciudad: dir.ciudad,
                          referencia: dir.referencia ?? '',
                        })}
                      </label>
                    ))}
                    <label
                      className={cn(
                        'flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm ring-1 ring-inset',
                        direccionIdx === 'nueva'
                          ? 'bg-amber-100/70 font-medium text-orange-950 ring-amber-400'
                          : 'bg-amber-50 text-stone-600 ring-amber-200',
                      )}
                    >
                      <input
                        type="radio"
                        name="direccion"
                        checked={direccionIdx === 'nueva'}
                        onChange={() => setDireccionIdx('nueva')}
                        className="accent-orange-800"
                      />
                      Otra dirección
                    </label>
                  </div>
                )}
                {direccionIdx === 'nueva' && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field
                      label="Calle y número"
                      required
                      value={dirNueva.calle}
                      onChange={(e) => setDirNueva((d) => ({ ...d, calle: e.target.value }))}
                      placeholder="Ej.: Belgrano 450"
                    />
                    <Field
                      label="Ciudad"
                      required
                      value={dirNueva.ciudad}
                      onChange={(e) => setDirNueva((d) => ({ ...d, ciudad: e.target.value }))}
                      placeholder="Ej.: Humahuaca"
                    />
                    <div className="sm:col-span-2">
                      <Field
                        label="Referencia (opcional)"
                        value={dirNueva.referencia}
                        onChange={(e) => setDirNueva((d) => ({ ...d, referencia: e.target.value }))}
                        placeholder="Ej.: portón verde, timbre 2"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Identificación */}
          <section className="rounded-2xl bg-white p-4 ring-1 ring-inset ring-amber-200/70">
            <h2 className="mb-3 text-sm font-bold text-orange-950">Tus datos</h2>
            {session ? (
              <p className="text-sm text-stone-600">
                Pedís como <span className="font-semibold text-orange-950">{perfil?.nombre ?? session.email}</span>
                {perfil?.telefono && ` · ${perfil.telefono}`}
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                <GoogleLogin />
                <div className="flex items-center gap-3">
                  <span className="h-px flex-1 bg-amber-200" />
                  <span className="text-xs font-medium uppercase tracking-wide text-stone-400">
                    o como invitado
                  </span>
                  <span className="h-px flex-1 bg-amber-200" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Nombre"
                    required
                    value={guest.nombre}
                    onChange={(e) => setGuest((g) => ({ ...g, nombre: e.target.value }))}
                    placeholder="Tu nombre"
                  />
                  <Field
                    label="Teléfono"
                    type="tel"
                    required
                    value={guest.telefono}
                    onChange={(e) => setGuest((g) => ({ ...g, telefono: e.target.value }))}
                    placeholder="388…"
                  />
                </div>
              </div>
            )}
          </section>

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-inset ring-red-200">
              {error}
            </p>
          )}

          <section className="sticky bottom-3 rounded-2xl bg-white p-4 shadow-lg ring-1 ring-inset ring-amber-200 sm:static sm:shadow-none">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-stone-600">
                Total · {count} ítem{count !== 1 && 's'}
              </span>
              <span className="text-xl font-bold text-orange-950">{formatArs(totalArs)}</span>
            </div>
            <button
              type="submit"
              disabled={!valido || estado === 'enviando'}
              className="h-13 w-full rounded-xl bg-orange-800 text-sm font-bold text-amber-50 transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-stone-300"
            >
              {estado === 'enviando' ? 'Enviando…' : 'Confirmar pedido'}
            </button>
            <p className="mt-2 text-center text-[11px] text-stone-400">
              El local confirma tu pedido antes de enviarlo a cocina.
            </p>
          </section>
        </>
      )}
    </form>
  );
}
