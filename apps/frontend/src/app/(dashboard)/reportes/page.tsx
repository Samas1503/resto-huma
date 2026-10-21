import { VentasSection } from '@/components/reportes/ventas-section';

// Contenido detrás del RoleGuard cliente: no puede renderizarse al navegar.
export const instant = false;

export default function ReportesVentasPage() {
  return <VentasSection />;
}
