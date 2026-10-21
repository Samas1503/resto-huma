'use client';

// Fetch genérico de un endpoint de reportes. `path` ya incluye el query string
// (rango de fechas); al cambiar el path se refetchea. `loading` se deriva del
// path resuelto (sin setState sincrónico en el efecto): mientras no haya
// respuesta para el path actual, se considera cargando y se sigue mostrando
// la data anterior si existe.
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export interface ReporteState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useReporte<T>(path: string): ReporteState<T> {
  const [result, setResult] = useState<{
    path: string;
    data: T | null;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<T>(path)
      .then((data) => {
        if (!cancelled) setResult({ path, data, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setResult({
          path,
          data: null,
          error: err instanceof Error ? err.message : 'No se pudo cargar el reporte.',
        });
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (result && result.path === path) {
    return { data: result.data, loading: false, error: result.error };
  }
  return { data: result?.data ?? null, loading: true, error: null };
}
