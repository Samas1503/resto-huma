'use client';

// Shell cliente de /reportes: guard admin+cajero, provee el rango de fechas
// compartido por las secciones y la navegación por pestañas.
import type { ReactNode } from 'react';
import { RoleGuard } from '@/components/ui/role-guard';
import { RangoProvider } from './rango-context';
import { ReportesToolbar } from './reportes-toolbar';

export function ReportesShell({ children }: { children: ReactNode }) {
  return (
    <RoleGuard roles={['admin', 'cajero']}>
      <RangoProvider>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900">Reportes</h1>
            <p className="text-sm text-zinc-500">
              Ventas, productos, costos y estado de caja del local.
            </p>
          </div>
          <ReportesToolbar />
          {children}
        </div>
      </RangoProvider>
    </RoleGuard>
  );
}
