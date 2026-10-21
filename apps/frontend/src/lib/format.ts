// Formato de montos y fechas para el dominio (ARS entero, es-AR).
const arsFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

export function formatArs(montoArs: number): string {
  return arsFormatter.format(montoArs);
}

export function formatDateTime(iso: string | Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(iso));
}

export function formatTime(iso: string | Date): string {
  return new Intl.DateTimeFormat('es-AR', { timeStyle: 'short' }).format(new Date(iso));
}
