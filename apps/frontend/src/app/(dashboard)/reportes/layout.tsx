// Layout de /reportes (server component). La navegación no puede ser instantánea:
// el contenido está detrás del RoleGuard cliente (sesión en localStorage), así
// que el segmento se excluye de la validación de instant navigation.
import { ReportesShell } from '@/components/reportes/reportes-shell';

export const instant = false;

export default function ReportesLayout({ children }: LayoutProps<'/reportes'>) {
  return <ReportesShell>{children}</ReportesShell>;
}
