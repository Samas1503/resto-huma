// Estados de feedback compartidos por las secciones de reportes.
import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';

export function ReporteLoading() {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-sm text-zinc-400">Cargando reporte…</p>
      </CardContent>
    </Card>
  );
}

export function ReporteError({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-sm text-red-600">{message}</p>
      </CardContent>
    </Card>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-zinc-400">{children}</p>;
}
