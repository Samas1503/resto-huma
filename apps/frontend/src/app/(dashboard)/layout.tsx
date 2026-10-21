'use client';

// Shell del dashboard (route group, no afecta la URL): sidebar por módulos +
// topbar con usuario/logout. Guard de sesión client-side (localStorage + Bearer).
import { useRequireRol } from '@/lib/use-require-rol';
import { Sidebar } from '@/components/ui/sidebar';
import { Topbar } from '@/components/ui/topbar';

function Shell({ children }: { children: React.ReactNode }) {
  const { status, session } = useRequireRol();

  // checking/unauthenticated: pantalla neutra mientras se resuelve o redirige.
  if (status !== 'authorized' || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100 text-sm text-zinc-400">
        Cargando…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-zinc-100">
      <Sidebar session={session} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar session={session} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: LayoutProps<'/'>) {
  return <Shell>{children}</Shell>;
}
