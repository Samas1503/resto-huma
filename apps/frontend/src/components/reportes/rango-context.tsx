'use client';

// Contexto del rango de fechas compartido por las secciones de /reportes.
// Vacío = sin filtro (el backend devuelve todo el historial).
import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export interface RangoFechas {
  /** YYYY-MM-DD o '' (sin límite). */
  desde: string;
  hasta: string;
}

interface RangoState {
  rango: RangoFechas;
  setRango: (rango: RangoFechas) => void;
}

const RangoContext = createContext<RangoState | null>(null);

export function RangoProvider({ children }: { children: ReactNode }) {
  const [rango, setRango] = useState<RangoFechas>({ desde: '', hasta: '' });
  const value = useMemo(() => ({ rango, setRango }), [rango]);
  return <RangoContext.Provider value={value}>{children}</RangoContext.Provider>;
}

export function useRangoReportes(): RangoState {
  const ctx = useContext(RangoContext);
  if (!ctx) throw new Error('useRangoReportes debe usarse dentro de <RangoProvider>');
  return ctx;
}

// Query string (?desde=…&hasta=…) a partir del rango; '' si no hay filtro.
export function rangoQuery(rango: RangoFechas): string {
  const params = new URLSearchParams();
  if (rango.desde) params.set('desde', rango.desde);
  if (rango.hasta) params.set('hasta', rango.hasta);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}
