// Sesión del empleado: tokens JWT en localStorage + header Bearer
// (decisión de transporte acordada con B1, ver spec 001 §A2).
import type { Rol, TokensDto } from '@resto-huma/shared';

const ACCESS_KEY = 'rh.accessToken';
const REFRESH_KEY = 'rh.refreshToken';
const AUTH_CHANGED_EVENT = 'rh:auth-changed';

// Payload firmado por el backend: { sub, email, rol } (auth.service.ts).
export interface JwtPayload {
  sub: string;
  email: string;
  rol: Rol;
  iat?: number;
  exp?: number;
}

export interface Session {
  userId: string;
  email: string;
  rol: Rol;
  /** true si el access token venció (el api client igual puede refrescar). */
  expired: boolean;
}

function storage(): Storage | null {
  return typeof window === 'undefined' ? null : window.localStorage;
}

function notifyAuthChanged(): void {
  if (storage()) window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

// Suscripción para useSyncExternalStore: cambios en esta pestaña (evento
// propio) y en otras pestañas (evento nativo 'storage').
export function subscribeAuth(callback: () => void): () => void {
  window.addEventListener(AUTH_CHANGED_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(AUTH_CHANGED_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

export function getAccessToken(): string | null {
  return storage()?.getItem(ACCESS_KEY) ?? null;
}

export function getRefreshToken(): string | null {
  return storage()?.getItem(REFRESH_KEY) ?? null;
}

export function setTokens(tokens: TokensDto): void {
  const s = storage();
  if (!s) return;
  s.setItem(ACCESS_KEY, tokens.accessToken);
  s.setItem(REFRESH_KEY, tokens.refreshToken);
  notifyAuthChanged();
}

export function clearTokens(): void {
  const s = storage();
  if (!s) return;
  s.removeItem(ACCESS_KEY);
  s.removeItem(REFRESH_KEY);
  notifyAuthChanged();
}

export function decodeJwtPayload<T>(token: string): T | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

// Snapshot memoizado por token: useSyncExternalStore exige referencia estable.
let sessionCache: { token: string | null; session: Session | null } | null = null;

// Sesión actual derivada del access token. Devuelve null si no hay token o no decodifica.
export function getSession(): Session | null {
  const token = getAccessToken();
  if (sessionCache?.token === token) return sessionCache.session;
  const payload = token ? decodeJwtPayload<JwtPayload>(token) : null;
  const session: Session | null =
    payload?.sub && payload.rol
      ? {
          userId: payload.sub,
          email: payload.email ?? '',
          rol: payload.rol,
          expired: payload.exp !== undefined && payload.exp * 1000 <= Date.now(),
        }
      : null;
  sessionCache = { token, session };
  return session;
}

// Navegación hard a /login: limpia el estado cliente (React, sockets) de paso.
// No usa useRouter porque se invoca desde lib fuera del árbol de componentes.
export function redirectToLogin(): void {
  if (typeof window !== 'undefined') {
    window.location.assign(new URL('/login', window.location.origin).href);
  }
}

export function logout(): void {
  clearTokens();
  redirectToLogin();
}
