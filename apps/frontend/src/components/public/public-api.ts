// Fetch del portal público: adjunta el JWT de CLIENTE (rh.clienteToken).
// No usa src/lib/api.ts porque ese cliente inyecta el token de EMPLEADO y
// redirige a /login ante un 401 — comportamiento del dashboard, no del portal.
import { ApiError, API_URL } from '@/lib/api';
import { getClienteToken } from './cliente-session';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function publicRequest<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const token = getClienteToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const data = await parseBody(res);
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

export const publicApi = {
  get: <T = unknown>(path: string) => publicRequest<T>(path),
  post: <T = unknown>(path: string, body?: unknown) =>
    publicRequest<T>(path, { method: 'POST', body }),
};
