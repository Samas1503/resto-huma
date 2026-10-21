'use client';

// Topbar del dashboard: usuario actual (email + rol del JWT) y logout.
import type { Rol } from '@resto-huma/shared';
import { logout, type Session } from '@/lib/auth';
import { Badge } from './badge';
import { Button } from './button';
import { IconLogout, IconUser } from './icons';

const ROL_LABEL: Record<Rol, string> = {
  admin: 'Admin',
  mozo: 'Mozo',
  cocina: 'Cocina',
  cajero: 'Cajero',
  repartidor: 'Repartidor',
};

export function Topbar({ session }: { session: Session }) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-6">
      <div className="text-sm font-medium text-zinc-500">Panel de gestión</div>
      <div className="flex items-center gap-3">
        <IconUser className="size-5 text-zinc-400" />
        <span className="max-w-48 truncate text-sm text-zinc-700">{session.email}</span>
        <Badge tone="violet">{ROL_LABEL[session.rol] ?? session.rol}</Badge>
        <Button variant="ghost" size="sm" onClick={logout}>
          <IconLogout className="size-4" />
          Salir
        </Button>
      </div>
    </header>
  );
}
