'use client';

// Guard por rol para vistas del dashboard.
// Uso: const { status, session } = useRequireRol('admin', 'cajero');
// Sin roles → cualquier empleado autenticado.
// Lee localStorage vía useSyncExternalStore: el prerender/hidratación usa el
// snapshot de servidor ('checking') y la sesión real se resuelve post-mount.
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { Rol } from '@resto-huma/shared';
import { getRefreshToken, getSession, subscribeAuth, type Session } from './auth';

export type GuardStatus = 'checking' | 'authorized' | 'forbidden' | 'unauthenticated';

export interface GuardState {
  status: GuardStatus;
  session: Session | null;
}

const noopSubscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
const hasRefreshSnapshot = () => getRefreshToken() !== null;

export function useRequireRol(...roles: Rol[]): GuardState {
  const router = useRouter();
  // false en server/hidratación, true post-mount en cliente.
  const mounted = useSyncExternalStore(noopSubscribe, clientSnapshot, serverSnapshot);
  const session = useSyncExternalStore(subscribeAuth, getSession, () => null);
  const hasRefresh = useSyncExternalStore(subscribeAuth, hasRefreshSnapshot, serverSnapshot);
  const rolesKey = roles.join(',');

  const state = useMemo<GuardState>(() => {
    if (!mounted) return { status: 'checking', session: null };
    // Sin sesión, o access token vencido sin refresh disponible → login.
    if (!session || (session.expired && !hasRefresh)) {
      return { status: 'unauthenticated', session: null };
    }
    const allowed = rolesKey ? (rolesKey.split(',') as Rol[]) : [];
    if (allowed.length > 0 && !allowed.includes(session.rol)) {
      return { status: 'forbidden', session };
    }
    return { status: 'authorized', session };
  }, [mounted, session, hasRefresh, rolesKey]);

  useEffect(() => {
    if (state.status === 'unauthenticated') router.replace('/login');
  }, [state.status, router]);

  return state;
}
