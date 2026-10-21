'use client';

// /admin/insumos — stock, insumos, movimientos y recetas. Solo rol admin.
import { RoleGuard } from '@/components/ui/role-guard';
import { InsumosAdmin } from '@/components/admin/insumos-admin';

export default function AdminInsumosPage() {
  return (
    <RoleGuard roles={['admin']}>
      <InsumosAdmin />
    </RoleGuard>
  );
}
