// Cliente HTTP hacia la API NestJS. Inyecta Bearer y refresca el access token
// ante un 401 (POST /auth/refresh con rotación; si falla → logout → /login).
import type { TokensDto } from '@resto-huma/shared';
import { clearTokens, getAccessToken, getRefreshToken, redirectToLogin, setTokens } from './auth';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? (typeof window !== 'undefined' ? `http://${window.location.hostname}:3001` : 'http://localhost:3001');

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly data: unknown,
  ) {
    super(extractMessage(data) ?? `Error ${status}`);
    this.name = 'ApiError';
  }
}

// Nest devuelve { message: string | string[] } en errores de validación.
function extractMessage(data: unknown): string | null {
  if (data && typeof data === 'object' && 'message' in data) {
    const message = (data as { message: unknown }).message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join(', ');
  }
  return null;
}

async function parseBody(res: Response): Promise<unknown> {
  if (res.status === 204) return null;
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function isAuthPath(path: string): boolean {
  return path.startsWith('/auth/');
}

// Single-flight: varios requests concurrentes comparten un único refresh.
let refreshPromise: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const tokens = (await res.json()) as TokensDto;
    setTokens(tokens);
    return true;
  } catch {
    return false;
  }
}

function tryRefresh(): Promise<boolean> {
  refreshPromise ??= refreshTokens().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
}

export async function request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const doFetch = () =>
    fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

  let res = await doFetch();

  // Access token vencido: refrescar y reintentar una vez.
  // No aplica a /auth/* (un 401 de login es credencial inválida, no sesión vencida).
  if (res.status === 401 && !isAuthPath(path) && getAccessToken()) {
    if (await tryRefresh()) {
      res = await doFetch();
    } else {
      clearTokens();
      redirectToLogin();
      throw new ApiError(401, null);
    }
  }

  const data = await parseBody(res);
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

export const api = {
  get: <T = unknown>(path: string) => request<T>(path),
  post: <T = unknown>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  patch: <T = unknown>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  put: <T = unknown>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  del: <T = unknown>(path: string) => request<T>(path, { method: 'DELETE' }),
};
