'use client';

// Sidebar colapsable por módulos, estilo dashboard (Agorapulse).
// Las rutas apuntan a las subrutas de (dashboard) que implementan los workers C2–C8.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSyncExternalStore, type ComponentType } from 'react';
import type { Rol } from '@resto-huma/shared';
import { cn } from '@/lib/utils';
import type { Session } from '@/lib/auth';
import {
  IconCash,
  IconDelivery,
  IconFlame,
  IconHome,
  IconKitchen,
  IconMenuAdmin,
  IconPanelLeft,
  IconReports,
  IconSales,
  IconTables,
  type IconProps,
} from './icons';

const COLLAPSED_KEY = 'rh.sidebarCollapsed';
const COLLAPSED_EVENT = 'rh:sidebar-toggled';

// Estado "colapsado" persistido en localStorage, leído vía useSyncExternalStore
// (server snapshot = expandido; el valor real se aplica post-hidratación).
function subscribeCollapsed(callback: () => void): () => void {
  window.addEventListener(COLLAPSED_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(COLLAPSED_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

function useSidebarCollapsed(): [boolean, () => void] {
  const collapsed = useSyncExternalStore(
    subscribeCollapsed,
    () => localStorage.getItem(COLLAPSED_KEY) === '1',
    () => false,
  );
  const toggle = () => {
    localStorage.setItem(COLLAPSED_KEY, collapsed ? '0' : '1');
    window.dispatchEvent(new Event(COLLAPSED_EVENT));
  };
  return [collapsed, toggle];
}

interface NavItem {
  label: string;
  href: string;
  icon: ComponentType<IconProps>;
  roles: Rol[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Inicio', href: '/', icon: IconHome, roles: ['admin', 'mozo', 'cocina', 'cajero', 'repartidor'] },
  { label: 'Ventas / Pedidos', href: '/pedidos', icon: IconSales, roles: ['admin', 'cajero', 'mozo'] },
  { label: 'Salón', href: '/salon', icon: IconTables, roles: ['admin', 'mozo'] },
  { label: 'Cocina', href: '/cocina', icon: IconKitchen, roles: ['admin', 'cocina'] },
  { label: 'Caja', href: '/caja', icon: IconCash, roles: ['admin', 'cajero'] },
  { label: 'Reparto', href: '/reparto', icon: IconDelivery, roles: ['admin', 'repartidor', 'cajero'] },
  { label: 'Menú / Admin', href: '/admin', icon: IconMenuAdmin, roles: ['admin'] },
  { label: 'Reportes', href: '/reportes', icon: IconReports, roles: ['admin', 'cajero'] },
];

export function Sidebar({ session }: { session: Session }) {
  const pathname = usePathname();
  const [collapsed, toggle] = useSidebarCollapsed();

  const items = NAV_ITEMS.filter((item) => item.roles.includes(session.rol));

  return (
    <aside
      className={cn(
        'flex min-h-screen flex-col border-r border-zinc-200 bg-white transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      <div className={cn('flex h-14 items-center gap-2 border-b border-zinc-100 px-4', collapsed && 'justify-center px-0')}>
        <IconFlame className="size-6 text-amber-600" />
        {!collapsed && (
          <span className="truncate text-sm font-semibold tracking-tight text-zinc-900">
            resto-huma
          </span>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {items.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          const ItemIcon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                collapsed && 'justify-center px-0',
                active
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
              )}
            >
              <ItemIcon />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-zinc-100 p-2">
        <button
          onClick={toggle}
          title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900',
            collapsed && 'justify-center px-0',
          )}
        >
          <IconPanelLeft className={cn('transition-transform', collapsed && 'rotate-180')} />
          {!collapsed && <span>Colapsar</span>}
        </button>
      </div>
    </aside>
  );
}
