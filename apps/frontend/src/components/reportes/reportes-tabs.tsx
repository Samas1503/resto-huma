'use client';

// Pestañas de navegación entre las secciones de /reportes (rutas hermanas).
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export const REPORTES_TABS = [
  { label: 'Ventas', href: '/reportes' },
  { label: 'Productos top', href: '/reportes/productos' },
  { label: 'Costo de mercadería', href: '/reportes/costo-mercaderia' },
  { label: 'Caja', href: '/reportes/caja' },
] as const;

export function ReportesTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1 rounded-xl border border-zinc-200 bg-white p-1 shadow-sm">
      {REPORTES_TABS.map((tab) => {
        const active =
          tab.href === '/reportes' ? pathname === '/reportes' : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              active ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
