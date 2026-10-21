'use client';

// Fetch client-side de un recurso admin con reload manual.
// path=null → no fetch (para selects dependientes). reload() vuelve a pedir.
// El estado se guarda por clave (path+tick): loading se deriva (sin reset
// sincrónico en el efecto → react-hooks/set-state-in-effect) y datos viejos
// nunca se muestran para otra clave.
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';

export interface ApiListState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Error inesperado';
}

interface FetchResult<T> {
  key: string;
  data: T | null;
  error: string | null;
}

export function useApiList<T>(path: string | null): ApiListState<T> {
  const [tick, setTick] = useState(0);
  const [result, setResult] = useState<FetchResult<T> | null>(null);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  const key = `${path ?? ''}#${tick}`;

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    api
      .get<T>(path)
      .then((data) => !cancelled && setResult({ key, data, error: null }))
      .catch((e: unknown) => !cancelled && setResult({ key, data: null, error: errorMessage(e) }));
    return () => {
      cancelled = true;
    };
  }, [key, path]);

  const current = result && result.key === key ? result : null;
  return {
    data: current?.data ?? null,
    loading: path !== null && current === null,
    error: current?.error ?? null,
    reload,
  };
}
