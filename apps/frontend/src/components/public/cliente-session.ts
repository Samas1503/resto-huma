'use client';

// Sesión del CLIENTE del portal público. Es independiente de la sesión de
// empleados (src/lib/auth.ts): el backend emite un JWT propio con claim
// tipo:'cliente' (POST /auth/google, TTL largo, sin refresh) y se guarda en
// keys separadas para que ambas sesiones puedan coexistir en el mismo browser.
import { useSyncExternalStore } from 'react';
import type { ClienteDto } from '@resto-huma/shared';
import { decodeJwtPayload } from '@/lib/auth';

const TOKEN_KEY = 'rh.clienteToken';
const PERFIL_KEY = 'rh.clientePerfil';
const CLIENTE_CHANGED_EVENT = 'rh:cliente-changed';

interface ClienteJwtPayload {
  sub: string;
  email: string;
  tipo: 'cliente';
  exp?: number;
}

export interface ClienteSession {
  clienteId: string;
  email: string;
  expired: boolean;
}

function storage(): Storage | null {
  return typeof window === 'undefined' ? null : window.localStorage;
}

function notify(): void {
  if (storage()) window.dispatchEvent(new Event(CLIENTE_CHANGED_EVENT));
}

export function subscribeCliente(callback: () => void): () => void {
  window.addEventListener(CLIENTE_CHANGED_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(CLIENTE_CHANGED_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

export function getClienteToken(): string | null {
  return storage()?.getItem(TOKEN_KEY) ?? null;
}

export function getClientePerfil(): ClienteDto | null {
  const raw = storage()?.getItem(PERFIL_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ClienteDto;
  } catch {
    return null;
  }
}

export function saveClienteSession(accessToken: string, cliente: ClienteDto): void {
  const s = storage();
  if (!s) return;
  s.setItem(TOKEN_KEY, accessToken);
  s.setItem(PERFIL_KEY, JSON.stringify(cliente));
  notify();
}

export function setClientePerfil(cliente: ClienteDto): void {
  const s = storage();
  if (!s) return;
  s.setItem(PERFIL_KEY, JSON.stringify(cliente));
  notify();
}

export function clearClienteSession(): void {
  const s = storage();
  if (!s) return;
  s.removeItem(TOKEN_KEY);
  s.removeItem(PERFIL_KEY);
  notify();
}

// Snapshot memoizado por token (useSyncExternalStore exige referencia estable).
let sessionCache: { token: string | null; session: ClienteSession | null } | null = null;

export function getClienteSession(): ClienteSession | null {
  const token = getClienteToken();
  if (sessionCache?.token === token) return sessionCache.session;
  const payload = token ? decodeJwtPayload<ClienteJwtPayload>(token) : null;
  const session: ClienteSession | null =
    payload?.sub && payload.tipo === 'cliente'
      ? {
          clienteId: payload.sub,
          email: payload.email ?? '',
          expired: payload.exp !== undefined && payload.exp * 1000 <= Date.now(),
        }
      : null;
  sessionCache = { token, session };
  return session;
}

const noopSubscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
const nullSnapshot = () => null;

// Sesión del cliente resuelta post-mount (evita mismatch de hidratación).
export function useClienteSession(): { mounted: boolean; session: ClienteSession | null } {
  const mounted = useSyncExternalStore(noopSubscribe, clientSnapshot, serverSnapshot);
  const session = useSyncExternalStore(subscribeCliente, getClienteSession, nullSnapshot);
  return { mounted, session: mounted ? session : null };
}
