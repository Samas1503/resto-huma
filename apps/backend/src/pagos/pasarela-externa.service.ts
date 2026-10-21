import { BadGatewayException } from '@nestjs/common';
import type {
  EstadoCobroPasarela,
  PasarelaPagoAdapter,
  ResultadoConfirmarCobro,
  ResultadoIniciarCobro,
} from './pasarela-pago.port.js';

const ESTADOS: readonly EstadoCobroPasarela[] = ['aprobado', 'rechazado', 'pendiente'];

/**
 * Adaptador HTTP al servicio externo de cobros (proyecto aparte, fuera de scope).
 * Contrato asumido del servicio (documentar al implementarlo):
 *   POST {url}/cobros        {pedidoId, montoArs, moneda:'ARS'} → {id|referenciaExterna, checkoutUrl?}
 *   GET  {url}/cobros/{ref}  → {estado: 'aprobado'|'rechazado'|'pendiente'}
 *   POST {url}/reembolsos    {pagoId} → 2xx
 * Auth: Bearer PAYMENT_GATEWAY_KEY. El servicio nos avisa por webhook firmado
 * (HMAC-SHA256 de `${referenciaExterna}.${estado}` con PAYMENT_WEBHOOK_SECRET).
 */
export class PasarelaExternaService implements PasarelaPagoAdapter {
  readonly pendienteConfirmacion = true;

  private baseUrl: string;

  constructor(
    baseUrl: string,
    private apiKey: string,
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  async iniciarCobro(pedidoId: string, montoArs: number): Promise<ResultadoIniciarCobro> {
    const body = await this.req('/cobros', {
      method: 'POST',
      body: JSON.stringify({ pedidoId, montoArs, moneda: 'ARS' }),
    });
    const referenciaExterna = body.referenciaExterna ?? body.id;
    if (typeof referenciaExterna !== 'string' || !referenciaExterna) {
      throw new BadGatewayException('La pasarela no devolvió referenciaExterna');
    }
    const checkoutUrl = body.checkoutUrl ?? body.checkout_url;
    return {
      referenciaExterna,
      checkoutUrl: typeof checkoutUrl === 'string' ? checkoutUrl : undefined,
    };
  }

  async confirmarCobro(referenciaExterna: string): Promise<ResultadoConfirmarCobro> {
    const body = await this.req(`/cobros/${encodeURIComponent(referenciaExterna)}`);
    if (!ESTADOS.includes(body.estado as EstadoCobroPasarela)) {
      throw new BadGatewayException('La pasarela devolvió un estado de cobro inválido');
    }
    return { estado: body.estado as EstadoCobroPasarela };
  }

  async reembolsar(pagoId: string): Promise<void> {
    await this.req('/reembolsos', { method: 'POST', body: JSON.stringify({ pagoId }) });
  }

  private async req(path: string, init?: RequestInit): Promise<Record<string, unknown>> {
    let res: Response;
    try {
      const headers = new Headers(init?.headers);
      headers.set('content-type', 'application/json');
      headers.set('authorization', `Bearer ${this.apiKey}`);
      res = await fetch(`${this.baseUrl}${path}`, { ...init, headers });
    } catch {
      throw new BadGatewayException('Pasarela de pagos inaccesible');
    }
    if (!res.ok) {
      throw new BadGatewayException(`Pasarela respondió ${res.status}`);
    }
    return res.status === 204 ? {} : ((await res.json()) as Record<string, unknown>);
  }
}
