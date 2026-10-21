// Las vistas del salón son 100% cliente (fetch + socket + polling) y el
// pathname de las rutas dinámicas no se conoce en build — se opta el segmento
// entero por "permitido bloquear" (instant = false, ver docs de Cache
// Components de Next 16).
export const instant = false;

export default function SalonLayout({ children }: LayoutProps<'/salon'>) {
  return children;
}
