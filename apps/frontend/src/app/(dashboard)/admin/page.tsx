'use client';

// Hub del módulo admin: accesos a cada sección. Solo rol admin (RoleGuard).
import Link from 'next/link';
import { RoleGuard } from '@/components/ui/role-guard';
import { Card, CardContent } from '@/components/ui/card';
import { IconChevronRight } from '@/components/ui/icons';

const SECTIONS = [
  {
    label: 'Menú',
    href: '/admin/menu',
    descripcion: 'Productos, precios duales (ARS/USD) y variedades',
  },
  {
    label: 'Insumos',
    href: '/admin/insumos',
    descripcion: 'Stock, alertas de stock bajo, compras y recetas',
  },
  {
    label: 'Usuarios',
    href: '/admin/usuarios',
    descripcion: 'Empleados, roles y activación de cuentas',
  },
  {
    label: 'Promociones',
    href: '/admin/promociones',
    descripcion: 'Ofertas, vigencias y productos alcanzados',
  },
  {
    label: 'Reservas',
    href: '/admin/reservas',
    descripcion: 'Reservas de mesa, estados y carga manual',
  },
  {
    label: 'Configuración',
    href: '/admin/config',
    descripcion: 'Canales de venta y ajustes del local',
  },
];

export default function AdminPage() {
  return (
    <RoleGuard roles={['admin']}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((s) => (
          <Link key={s.href} href={s.href} className="group">
            <Card className="h-full transition-colors group-hover:border-zinc-300 group-hover:shadow">
              <CardContent className="flex items-center justify-between gap-2 pt-5">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">{s.label}</p>
                  <p className="mt-1 text-xs text-zinc-500">{s.descripcion}</p>
                </div>
                <IconChevronRight className="size-4 text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-500" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </RoleGuard>
  );
}
