'use client';

// /admin/reservas — gestión de reservas por estado. Solo rol admin.
import { RoleGuard } from '@/components/ui/role-guard';
import { ReservasAdmin } from '@/components/admin/reservas-admin';

export default function AdminReservasPage() {
  return (
    <RoleGuard roles={['admin']}>
      <ReservasAdmin />
    </RoleGuard>
  );
}
