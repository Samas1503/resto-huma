'use client';

// Polling suave: re-ejecuta `fn` cada `intervalMs` solo cuando la pestaña está
// visible. Complementa a los eventos de socket para mantener el mapa fresco.
import { useEffect, useRef } from 'react';

export function usePolling(fn: () => void, intervalMs: number) {
  const ref = useRef(fn);
  useEffect(() => {
    ref.current = fn;
  });
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') ref.current();
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}
