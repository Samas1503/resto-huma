import type { Metadata } from 'next';
import { PublicShell } from '@/components/public/public-shell';

export const metadata: Metadata = {
  title: 'Resto Huma — Carta y pedidos',
  description: 'Pedí empanadas y comida regional del NOA para llevar o delivery, y reservá tu mesa.',
};

// Layout del portal público (route group: no agrega segmento a la URL).
// Es público: NO usar el guard de empleados del dashboard acá.
export default function PublicLayout({ children }: LayoutProps<'/'>) {
  return <PublicShell>{children}</PublicShell>;
}
