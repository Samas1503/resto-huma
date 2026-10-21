'use client';

// Bandeja del repartidor (C8): delivery listos para retirar + entregas en curso.
import { RoleGuard } from '@/components/ui/role-guard';
import { BandejaReparto } from '@/components/reparto/bandeja-reparto';

export default function RepartoPage() {
  return (
    <RoleGuard roles={['repartidor', 'admin', 'cajero']}>
      <BandejaReparto />
    </RoleGuard>
  );
}
