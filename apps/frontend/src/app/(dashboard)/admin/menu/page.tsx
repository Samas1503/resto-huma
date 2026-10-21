'use client';

// /admin/menu — CRUD de productos y variedades. Solo rol admin.
import { RoleGuard } from '@/components/ui/role-guard';
import { MenuAdmin } from '@/components/admin/menu-admin';

export default function AdminMenuPage() {
  return (
    <RoleGuard roles={['admin']}>
      <MenuAdmin />
    </RoleGuard>
  );
}
