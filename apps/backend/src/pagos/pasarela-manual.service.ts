import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  PasarelaPagoAdapter,
  ResultadoConfirmarCobro,
  ResultadoIniciarCobro,
} from './pasarela-pago.port.js';

/**
 * Adaptador manual (PAYMENT_PROVIDER=manual): no hay servicio remoto; genera una
 * referencia sintética y el pago se registra localmente de inmediato
 * (CobrosOnlineService lo persiste vía CobrosService).
 */
@Injectable()
export class PasarelaManualService implements PasarelaPagoAdapter {
  readonly pendienteConfirmacion = false;

  constructor(private prisma: PrismaService) {}

  iniciarCobro(): Promise<ResultadoIniciarCobro> {
    return Promise.resolve({ referenciaExterna: `manual_${randomUUID()}` });
  }

  async confirmarCobro(referenciaExterna: string): Promise<ResultadoConfirmarCobro> {
    const pago = await this.prisma.pago.findFirst({
      where: { referenciaExterna },
      include: { pedido: { select: { estadoPago: true } } },
    });
    if (!pago) return { estado: 'rechazado' };
    return { estado: pago.pedido.estadoPago === 'cobrado' ? 'aprobado' : 'pendiente' };
  }

  // La reversa de un cobro manual es la anulación con autorización admin
  // (POST /finanzas/anulaciones); no hay remoto al que llamar.
  reembolsar(): Promise<void> {
    return Promise.resolve();
  }
}
