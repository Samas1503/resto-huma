'use client';

// Carrito del portal público: persistido en localStorage ('rh.carrito') y
// leído vía useSyncExternalStore (mismo patrón que src/lib/auth.ts) para no
// romper la hidratación. Los precios son snapshots al momento de agregar
// (igual que ItemPedido congela precios en el backend).
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import type { Presentacion } from '@resto-huma/shared';

const CART_KEY = 'rh.carrito';
const CART_CHANGED_EVENT = 'rh:cart-changed';

export interface CartItem {
  /** clave compuesta: producto + variedad + presentación + notas */
  key: string;
  productoId: string;
  variedadId?: string;
  nombre: string;
  variedadNombre?: string;
  presentacion: Presentacion;
  cantidad: number;
  notas?: string;
  precioArs: number;
  precioUsd: string | number | null;
}

export interface CartItemInput {
  productoId: string;
  variedadId?: string;
  nombre: string;
  variedadNombre?: string;
  presentacion: Presentacion;
  cantidad: number;
  notas?: string;
  precioArs: number;
  precioUsd: string | number | null;
}

// ─── Store sobre localStorage ────────────────────────────────
// Snapshot memoizado por contenido crudo: useSyncExternalStore exige
// referencia estable entre renders.
let rawCache: string | null | undefined;
let itemsCache: CartItem[] = [];

function getCartItems(): CartItem[] {
  const raw = window.localStorage.getItem(CART_KEY);
  if (raw !== rawCache) {
    rawCache = raw;
    try {
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      itemsCache = Array.isArray(parsed) ? (parsed as CartItem[]) : [];
    } catch {
      itemsCache = [];
    }
  }
  return itemsCache;
}

function writeItems(items: CartItem[]): void {
  window.localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(CART_CHANGED_EVENT));
}

function subscribeCart(callback: () => void): () => void {
  window.addEventListener(CART_CHANGED_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(CART_CHANGED_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

const EMPTY: CartItem[] = [];
const serverSnapshot = () => EMPTY;

// ─── Context (UI del drawer + mutaciones) ────────────────────
interface CartContextValue {
  items: CartItem[];
  count: number;
  totalArs: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: CartItemInput) => void;
  updateCantidad: (key: string, delta: number) => void;
  removeItem: (key: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function itemKey(item: CartItemInput): string {
  return [item.productoId, item.variedadId ?? '', item.presentacion, item.notas ?? ''].join('|');
}

export function CartProvider({ children }: { children: ReactNode }) {
  const items = useSyncExternalStore(subscribeCart, getCartItems, serverSnapshot);
  const [isOpen, setIsOpen] = useState(false);

  const addItem = useCallback((item: CartItemInput) => {
    const key = itemKey(item);
    const prev = getCartItems();
    const existing = prev.find((i) => i.key === key);
    writeItems(
      existing
        ? prev.map((i) => (i.key === key ? { ...i, cantidad: i.cantidad + item.cantidad } : i))
        : [...prev, { ...item, key }],
    );
    setIsOpen(true);
  }, []);

  const updateCantidad = useCallback((key: string, delta: number) => {
    writeItems(
      getCartItems()
        .map((i) => (i.key === key ? { ...i, cantidad: i.cantidad + delta } : i))
        .filter((i) => i.cantidad > 0),
    );
  }, []);

  const removeItem = useCallback((key: string) => {
    writeItems(getCartItems().filter((i) => i.key !== key));
  }, []);

  const clear = useCallback(() => writeItems([]), []);
  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((acc, i) => acc + i.cantidad, 0);
    const totalArs = items.reduce((acc, i) => acc + i.precioArs * i.cantidad, 0);
    return { items, count, totalArs, isOpen, openCart, closeCart, addItem, updateCantidad, removeItem, clear };
  }, [items, isOpen, openCart, closeCart, addItem, updateCantidad, removeItem, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de <CartProvider>');
  return ctx;
}
