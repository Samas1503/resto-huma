'use client';

// /reserva — reserva pública de mesa → POST /reservas. Si el cliente está
// logueado se adjunta clienteId; si no, el nombre va en `notas` porque el DTO
// aún no tiene campo propio para invitados (ver pendientes).
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import type { ReservaDto } from '@resto-huma/shared';
import { ApiError } from '@/lib/api';
import { useClienteSession } from '@/components/public/cliente-session';
import { GoogleLogin } from '@/components/public/google-login';
import { publicApi } from '@/components/public/public-api';

const inputCls =
  'h-11 w-full rounded-xl bg-white px-3 text-sm text-orange-950 ring-1 ring-inset ring-amber-200 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-600';
const labelCls = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500';

export default function ReservaPage() {
  const { session } = useClienteSession();
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [personas, setPersonas] = useState(2);
  const [notas, setNotas] = useState('');
  const [estado, setEstado] = useState<'form' | 'enviando' | 'enviada'>('form');
  const [error, setError] = useState<string | null>(null);

  const valido =
    telefono.trim() !== '' && fecha !== '' && hora !== '' && personas >= 1 &&
    (session !== null || nombre.trim() !== '');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valido) return;
    setError(null);
    setEstado('enviando');
    try {
      // mesaId es obligatorio en el DTO actual pero lo asigna el local;
      // hasta que el backend exponga el alta pública, el request puede
      // responder 400/403 y se muestra el fallback abajo.
      await publicApi.post<ReservaDto>('/reservas', {
        clienteId: session?.clienteId,
        fechaHora: new Date(`${fecha}T${hora}:00`).toISOString(),
        cantidadPersonas: personas,
        telefonoContacto: telefono.trim(),
        notas: [session ? null : `Nombre: ${nombre.trim()}`, notas.trim() || null]
          .filter(Boolean)
          .join(' — ') || undefined,
      });
      setEstado('enviada');
    } catch (err) {
      setEstado('form');
      setError(
        err instanceof ApiError && (err.status === 401 || err.status === 403 || err.status === 400)
          ? 'La reserva online no está disponible en este momento. Escribinos o llamanos y te guardamos la mesa.'
          : 'No pudimos enviar la reserva. Intentá de nuevo.',
      );
    }
  };

  if (estado === 'enviada') {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100">
          <svg viewBox="0 0 24 24" className="size-8 text-emerald-700" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-orange-950">¡Reserva enviada!</h1>
        <p className="max-w-xs text-sm text-stone-600">
          El local va a confirmar tu mesa para el {fecha} a las {hora}. Ante
          cualquier cambio te contactan al {telefono}.
        </p>
        <Link
          href="/carta"
          className="flex h-11 items-center rounded-xl bg-orange-800 px-6 text-sm font-bold text-amber-50 transition-colors hover:bg-orange-700"
        >
          Volver a la carta
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-orange-950">Reservar mesa</h1>
        <p className="text-sm text-stone-500">
          Dejanos tus datos y te guardamos lugar para comer tranquilo.
        </p>
      </div>

      <section className="flex flex-col gap-4 rounded-2xl bg-white p-4 ring-1 ring-inset ring-amber-200/70">
        {!session && (
          <>
            <GoogleLogin />
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-amber-200" />
              <span className="text-xs font-medium uppercase tracking-wide text-stone-400">
                o sin cuenta
              </span>
              <span className="h-px flex-1 bg-amber-200" />
            </div>
            <div>
              <label htmlFor="res-nombre" className={labelCls}>Nombre</label>
              <input
                id="res-nombre"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Tu nombre"
                className={inputCls}
              />
            </div>
          </>
        )}
        <div>
          <label htmlFor="res-tel" className={labelCls}>Teléfono de contacto</label>
          <input
            id="res-tel"
            type="tel"
            required
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="388…"
            className={inputCls}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="res-fecha" className={labelCls}>Fecha</label>
            <input
              id="res-fecha"
              type="date"
              required
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="res-hora" className={labelCls}>Hora</label>
            <input
              id="res-hora"
              type="time"
              required
              value={hora}
              onChange={(e) => setHora(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>
        <div>
          <label htmlFor="res-personas" className={labelCls}>Personas</label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPersonas((p) => Math.max(1, p - 1))}
              className="flex size-9 items-center justify-center rounded-full bg-amber-100 text-lg font-bold text-orange-900 transition-colors hover:bg-amber-200"
            >
              −
            </button>
            <span className="w-8 text-center text-base font-bold text-orange-950">{personas}</span>
            <button
              type="button"
              onClick={() => setPersonas((p) => Math.min(20, p + 1))}
              className="flex size-9 items-center justify-center rounded-full bg-amber-100 text-lg font-bold text-orange-900 transition-colors hover:bg-amber-200"
            >
              +
            </button>
          </div>
        </div>
        <div>
          <label htmlFor="res-notas" className={labelCls}>
            Notas <span className="font-normal normal-case text-stone-400">(opcional)</span>
          </label>
          <input
            id="res-notas"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Ej.: cumpleaños, silla de bebé…"
            maxLength={160}
            className={inputCls}
          />
        </div>
      </section>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-inset ring-red-200">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!valido || estado === 'enviando'}
        className="h-13 w-full rounded-xl bg-orange-800 text-sm font-bold text-amber-50 transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-stone-300"
      >
        {estado === 'enviando' ? 'Enviando…' : 'Reservar'}
      </button>
    </form>
  );
}
