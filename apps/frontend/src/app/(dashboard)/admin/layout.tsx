'use client';

// Sub-navegación del módulo admin: tabs por sección (estilo settings de
// dashboard). El guard de rol vive en cada página, como pide la spec C5.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const SECTIONS = [
  { label: 'Menú', href: '/admin/menu' },
  { label: 'Insumos', href: '/admin/insumos' },
  { label: 'Usuarios', href: '/admin/usuarios' },
  { label: 'Promociones', href: '/admin/promociones' },
  { label: 'Reservas', href: '/admin/reservas' },
  { label: 'Configuración', href: '/admin/config' },
];

export default function AdminLayout({ children }: LayoutProps<'/admin'>) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900">Administración</h1>
        <p className="text-sm text-zinc-500">Carta, stock, usuarios, promos, reservas y ajustes.</p>
      </div>

      <nav className="flex flex-wrap gap-1 border-b border-zinc-200">
        {SECTIONS.map((s) => {
          const active = pathname.startsWith(s.href);
          return (
            <Link
              key={s.href}
              href={s.href}
              className={cn(
                'rounded-t-lg border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'border-zinc-900 text-zinc-900'
                  : 'border-transparent text-zinc-500 hover:text-zinc-900',
              )}
            >
              {s.label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
