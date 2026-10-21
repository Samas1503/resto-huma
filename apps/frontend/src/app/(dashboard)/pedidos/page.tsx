'use client';

// /pedidos — bandeja de pedidos para staff (admin, cajero, mozo).
// El guard de sesión del layout (dashboard) ya redirige a /login si no hay
// sesión; RoleGuard acota la vista a los roles del módulo (sidebar NAV_ITEMS).
import { RoleGuard } from '@/components/ui/role-guard';
import { PedidosBoard } from '@/components/pedidos/pedidos-board';

export default function PedidosPage() {
  return (
    <RoleGuard roles={['admin', 'cajero', 'mozo']}>
      <PedidosBoard />
    </RoleGuard>
  );
}
