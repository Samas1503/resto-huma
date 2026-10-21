'use client';

// Shell del portal público: header cálido regional (no el gris del dashboard),
// nav Carta/Reservar/Mi cuenta, estado del cliente y carrito (barra inferior
// mobile + drawer lateral). Sin guards: todas estas rutas son públicas.
// Las piezas que leen usePathname van en islas <Suspense> (Cache Components).
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Suspense, type ReactNode } from 'react';
import { IconFlame, IconSales, IconTables, IconUser } from '@/components/ui/icons';
import { formatArs } from '@/lib/format';
import { cn } from '@/lib/utils';
import { CartProvider, useCart } from './cart';
import { CartDrawer } from './cart-drawer';
import { useClienteSession } from './cliente-session';

const NAV = [
  { href: '/carta', label: 'La carta', Icon: IconFlame },
  { href: '/reserva', label: 'Reservar mesa', Icon: IconTables },
];

function CartButton() {
  const { count, openCart } = useCart();
  return (
    <button
      type="button"
      onClick={openCart}
      aria-label="Ver tu pedido"
      className="relative rounded-full p-2 text-amber-100 transition-colors hover:bg-white/10"
    >
      <IconSales className="size-6" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-amber-400 text-[11px] font-bold text-orange-950">
          {count}
        </span>
      )}
    </button>
  );
}

function NavLinksList({ pathname }: { pathname: string | null }) {
  return (
    <>
      {NAV.map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
            pathname === href
              ? 'bg-amber-400/90 text-orange-950'
              : 'text-amber-100 hover:bg-white/10',
          )}
        >
          <Icon className="mr-1 inline size-3.5 align-[-2px]" />
          {label}
        </Link>
      ))}
    </>
  );
}

function NavLinks() {
  const pathname = usePathname();
  return <NavLinksList pathname={pathname} />;
}

function BottomCartBarInner() {
  const { count, totalArs, openCart } = useCart();
  const pathname = usePathname();
  if (count === 0 || pathname === '/pedido') return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 p-3 sm:hidden">
      <button
        type="button"
        onClick={openCart}
        className="flex h-13 w-full items-center justify-between rounded-2xl bg-orange-800 px-5 text-amber-50 shadow-lg shadow-orange-950/30"
      >
        <span className="text-sm font-bold">Ver tu pedido · {count}</span>
        <span className="text-sm font-bold">{formatArs(totalArs)}</span>
      </button>
    </div>
  );
}

function ClienteLink() {
  const { session } = useClienteSession();
  return (
    <Link
      href="/cuenta"
      className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-amber-100 transition-colors hover:bg-white/10"
    >
      <IconUser className="size-5" />
      <span className="hidden max-w-32 truncate text-xs font-medium sm:inline">
        {session ? session.email : 'Ingresar'}
      </span>
    </Link>
  );
}

function ShellInner({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-amber-50 text-orange-950">
      <header className="sticky top-0 z-30 bg-gradient-to-r from-orange-950 via-orange-900 to-amber-900 shadow-md">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3">
          <Link href="/carta" className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-amber-400/90">
              <IconFlame className="size-5 text-orange-900" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-sm font-bold text-amber-50">Resto Huma</span>
              <span className="text-[10px] uppercase tracking-widest text-amber-300/80">
                Cocina regional
              </span>
            </span>
          </Link>

          <nav className="ml-auto flex items-center gap-1">
            <Suspense fallback={<NavLinksList pathname={null} />}>
              <NavLinks />
            </Suspense>
            <ClienteLink />
            <CartButton />
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-24 pt-5 sm:pb-10">{children}</main>

      <footer className="border-t border-amber-200/70 bg-amber-100/50 px-4 py-5 text-center text-xs text-stone-500">
        Cocina regional del NOA · Empanadas, humitas, tamales y locro
      </footer>

      <Suspense fallback={null}>
        <BottomCartBarInner />
      </Suspense>
      <CartDrawer />
    </div>
  );
}

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <ShellInner>{children}</ShellInner>
    </CartProvider>
  );
}
