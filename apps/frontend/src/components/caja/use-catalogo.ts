'use client';

// Catálogo de nombres para resolver productoId/variedadId en ítems de pedido.
// Fuente: GET /carta (pública, productos activos con variedades disponibles).
// Los productos dados de baja pueden no aparecer: se cae al id corto.
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

export interface CatalogoNombres {
  productoNombre: (productoId: string) => string;
  variedadNombre: (variedadId: string | undefined) => string | null;
}

// Shape de GET /carta (productos con variedades incluidas).
interface CartaItem {
  id: string;
  nombre: string;
  variedades: { id: string; nombre: string }[];
}

// Cache a nivel módulo: la carta cambia poco durante un turno de caja.
let cache: CatalogoNombres | null = null;

export function useCatalogo(): CatalogoNombres {
  const [catalogo, setCatalogo] = useState<CatalogoNombres>(
    cache ?? {
      productoNombre: (id) => `#${id.slice(-6).toUpperCase()}`,
      variedadNombre: () => null,
    },
  );
  const fetched = useRef(false);

  useEffect(() => {
    if (cache || fetched.current) return;
    fetched.current = true;
    let cancelled = false;
    api
      .get<CartaItem[]>('/carta')
      .then((productos) => {
        if (cancelled) return;
        const productosMap = new Map(productos.map((p) => [p.id, p.nombre]));
        const variedadesMap = new Map(
          productos.flatMap((p) => p.variedades.map((v) => [v.id, v.nombre] as const)),
        );
        const cat: CatalogoNombres = {
          productoNombre: (id) => productosMap.get(id) ?? `#${id.slice(-6).toUpperCase()}`,
          variedadNombre: (id) => (id ? (variedadesMap.get(id) ?? null) : null),
        };
        cache = cat;
        setCatalogo(cat);
      })
      .catch(() => {
        // Sin carta: los ítems se muestran con su id corto; no es bloqueante.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return catalogo;
}
