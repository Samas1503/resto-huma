'use client';

// Pantalla de cocina (C3): bandeja realtime de comandas.
// La lógica vive en <CocinaBoard/>; acá solo se aplica el guard por rol.
import { RoleGuard } from '@/components/ui/role-guard';
import { CocinaBoard } from '@/components/cocina/cocina-board';

export default function CocinaPage() {
  return (
    <RoleGuard roles={['cocina', 'admin']}>
      <CocinaBoard />
    </RoleGuard>
  );
}
