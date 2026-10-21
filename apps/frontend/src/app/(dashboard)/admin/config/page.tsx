'use client';

// /admin/config — configuración de canales y del local. Solo rol admin.
import { RoleGuard } from '@/components/ui/role-guard';
import { ConfigAdmin } from '@/components/admin/config-admin';

export default function AdminConfigPage() {
  return (
    <RoleGuard roles={['admin']}>
      <ConfigAdmin />
    </RoleGuard>
  );
}
