// Último pedido virtual creado desde este browser (para "tu último pedido"
// en /cuenta y retomar el seguimiento).
const ULTIMO_PEDIDO_KEY = 'rh.ultimoPedido';

export function setUltimoPedido(id: string): void {
  window.localStorage.setItem(ULTIMO_PEDIDO_KEY, id);
}

export function getUltimoPedido(): string | null {
  return window.localStorage.getItem(ULTIMO_PEDIDO_KEY);
}
