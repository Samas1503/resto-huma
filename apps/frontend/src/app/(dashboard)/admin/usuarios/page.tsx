'use client';

// /admin/usuarios — CRUD de empleados. Solo rol admin.
import { RoleGuard } from '@/components/ui/role-guard';
import { UsuariosAdmin } from '@/components/admin/usuarios-admin';

export default function AdminUsuariosPage() {
  return (
    <RoleGuard roles={['admin']}>
      <UsuariosAdmin />
    </RoleGuard>
  );
}
