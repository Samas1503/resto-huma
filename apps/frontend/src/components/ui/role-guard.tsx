'use client';

// Guard por rol reutilizable para las vistas de (dashboard).
// - Sin sesión → redirige a /login (vía useRequireRol).
// - Rol no permitido → muestra 403 (o `forbidden` custom).
// - Mientras verifica → muestra `loading`.
//
// Uso:
//   <RoleGuard roles={['admin', 'cajero']}>
//     <VistaCaja />
//   </RoleGuard>
import type { ReactNode } from 'react';
import type { Rol } from '@resto-huma/shared';
import { useRequireRol } from '@/lib/use-require-rol';

function LoadingScreen() {
  return (
    <div className="flex min-h-40 items-center justify-center text-sm text-zinc-400">
      Cargando…
    </div>
  );
}

function ForbiddenScreen() {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-center">
      <p className="text-4xl font-semibold text-zinc-300">403</p>
      <p className="text-sm text-zinc-500">No tenés permisos para ver esta sección.</p>
    </div>
  );
}

export interface RoleGuardProps {
  roles: Rol[];
  children: ReactNode;
  /** Fallback para 403. */
  forbidden?: ReactNode;
  /** Fallback mientras se verifica la sesión. */
  loading?: ReactNode;
}

export function RoleGuard({ roles, children, forbidden, loading }: RoleGuardProps) {
  const { status } = useRequireRol(...roles);
  if (status === 'checking') return <>{loading ?? <LoadingScreen />}</>;
  if (status === 'unauthenticated') return null;
  if (status === 'forbidden') return <>{forbidden ?? <ForbiddenScreen />}</>;
  return <>{children}</>;
}
