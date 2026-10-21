'use client';

// Filtro desde/hasta compartido por las secciones de reportes con rango
// (ventas, productos top, costo de mercadería). Se aplica al cambiar la fecha.
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { useRangoReportes } from './rango-context';

export function RangoFilter() {
  const { rango, setRango } = useRangoReportes();
  const hayFiltro = rango.desde !== '' || rango.hasta !== '';

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reportes-desde">Desde</Label>
        <Input
          id="reportes-desde"
          type="date"
          value={rango.desde}
          max={rango.hasta || undefined}
          onChange={(e) => setRango({ ...rango, desde: e.target.value })}
          className="w-40"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reportes-hasta">Hasta</Label>
        <Input
          id="reportes-hasta"
          type="date"
          value={rango.hasta}
          min={rango.desde || undefined}
          onChange={(e) => setRango({ ...rango, hasta: e.target.value })}
          className="w-40"
        />
      </div>
      {hayFiltro && (
        <Button variant="ghost" size="md" onClick={() => setRango({ desde: '', hasta: '' })}>
          Limpiar
        </Button>
      )}
      <p className="pb-2 text-xs text-zinc-400">
        {hayFiltro ? 'Mostrando el período seleccionado.' : 'Mostrando todo el historial.'}
      </p>
    </div>
  );
}
