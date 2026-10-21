'use client';

// Barra de /reportes: pestañas + filtro de rango. El estado de caja no depende
// del rango, así que el filtro se oculta en /reportes/caja.
import { usePathname } from 'next/navigation';
import { RangoFilter } from './rango-filter';
import { ReportesTabs } from './reportes-tabs';

export function ReportesToolbar() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-4">
      <ReportesTabs />
      {!pathname.startsWith('/reportes/caja') && <RangoFilter />}
    </div>
  );
}
