'use client';

// /admin/promociones — CRUD de promos y su composición. Solo rol admin.
import { RoleGuard } from '@/components/ui/role-guard';
import { PromocionesAdmin } from '@/components/admin/promociones-admin';

export default function AdminPromocionesPage() {
  return (
    <RoleGuard roles={['admin']}>
      <PromocionesAdmin />
    </RoleGuard>
  );
}
