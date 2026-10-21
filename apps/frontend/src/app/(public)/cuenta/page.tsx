'use client';

// /cuenta — login Google del cliente + perfil (GET /clientes/me con el JWT
// tipo:'cliente'): nombre, contacto y direcciones guardadas para delivery.
import Link from 'next/link';
import { useEffect, useState, useSyncExternalStore } from 'react';
import type { ClienteDto } from '@resto-huma/shared';
import { ApiError } from '@/lib/api';
import {
  clearClienteSession,
  getClientePerfil,
  subscribeCliente,
  useClienteSession,
} from '@/components/public/cliente-session';
import { GoogleLogin } from '@/components/public/google-login';
import { publicApi } from '@/components/public/public-api';
import { getUltimoPedido } from '@/components/public/ultimo-pedido';
import { IconDelivery, IconUser } from '@/components/ui/icons';

const nullSnapshot = () => null;

export default function CuentaPage() {
  const { mounted, session } = useClienteSession();
  const [perfilApi, setPerfilApi] = useState<ClienteDto | null>(null);
  const ultimoPedido = useSyncExternalStore(subscribeCliente, getUltimoPedido, nullSnapshot);
  const perfilCache = useSyncExternalStore(subscribeCliente, getClientePerfil, nullSnapshot);

  // Perfil más fresco disponible: respuesta de /clientes/me o el cache local.
  const perfil = session ? (perfilApi ?? perfilCache) : null;

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    publicApi
      .get<ClienteDto>('/clientes/me')
      .then((p) => !cancelled && setPerfilApi(p))
      .catch((err: unknown) => {
        // Token vencido/inválido → cerrar sesión de cliente.
        if (!cancelled && err instanceof ApiError && err.status === 401) {
          clearClienteSession();
        }
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  if (!mounted) {
    return <p className="py-16 text-center text-sm text-stone-500">Cargando…</p>;
  }

  if (!session) {
    return (
      <div className="mx-auto flex max-w-sm flex-col items-center gap-5 py-10 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-amber-100">
          <IconUser className="size-7 text-orange-800" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-orange-950">Tu cuenta</h1>
          <p className="mt-1 text-sm text-stone-600">
            Ingresá con Google para guardar tus direcciones y seguir tus pedidos.
          </p>
        </div>
        <GoogleLogin />
        <p className="text-xs text-stone-500">
          También podés pedir como invitado: solo te pedimos nombre y teléfono
          al confirmar.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-orange-950">Tu cuenta</h1>
        <button
          type="button"
          onClick={clearClienteSession}
          className="text-sm font-medium text-red-700/80 underline-offset-2 hover:underline"
        >
          Cerrar sesión
        </button>
      </div>

      <section className="rounded-2xl bg-white p-4 ring-1 ring-inset ring-amber-200/70">
        <p className="text-sm font-bold text-orange-950">{perfil?.nombre ?? session.email}</p>
        <p className="text-sm text-stone-500">{session.email}</p>
        {perfil?.telefono && <p className="mt-1 text-sm text-stone-500">{perfil.telefono}</p>}
      </section>

      {perfil && perfil.direcciones.length > 0 && (
        <section className="rounded-2xl bg-white p-4 ring-1 ring-inset ring-amber-200/70">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-orange-950">
            <IconDelivery className="size-4 text-orange-800" />
            Tus direcciones
          </h2>
          <ul className="flex flex-col gap-1.5">
            {perfil.direcciones.map((d, i) => (
              <li key={i} className="text-sm text-stone-600">
                {[d.calle, d.ciudad, d.referencia].filter(Boolean).join(', ')}
                {d.esPrincipal && (
                  <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                    principal
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {ultimoPedido && (
        <Link
          href={`/pedido/${ultimoPedido}`}
          className="flex items-center justify-between rounded-2xl bg-white p-4 ring-1 ring-inset ring-amber-200/70 transition-colors hover:bg-amber-50"
        >
          <div>
            <p className="text-sm font-bold text-orange-950">Tu último pedido</p>
            <p className="text-xs text-stone-500">#{ultimoPedido.slice(0, 8)}</p>
          </div>
          <span className="text-sm font-semibold text-orange-800">Ver estado →</span>
        </Link>
      )}

      <Link
        href="/carta"
        className="mx-auto text-sm font-medium text-stone-500 underline-offset-2 hover:underline"
      >
        Volver a la carta
      </Link>
    </div>
  );
}
