import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { CobrosService } from '../finanzas/cobros.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { IniciarCobroDto } from './dto/iniciar-cobro.dto.js';
import { WebhookPagoDto } from './dto/webhook-pago.dto.js';
import { PASARELA_PAGO } from './pasarela-pago.port.js';
import type { PasarelaPagoAdapter } from './pasarela-pago.port.js';

/** Clave de Configuracion donde se guarda la intención de cobro externo pendiente del webhook. */
const clavePendiente = (ref: string) => `pasarela.pendiente.${ref}`;

interface CobroPendiente {
  pedidoId: string;
  montoArs: number;
  usuarioId: string;
}

@Injectable()
export class CobrosOnlineService {
  constructor(
    @Inject(PASARELA_PAGO) private pasarela: PasarelaPagoAdapter,
    private cobros: CobrosService,
    private prisma: PrismaService,
  ) {}

  /**
   * Inicia un cobro online del pedido (canal virtual).
   * - manual: registra el pago local en el acto con referencia sintética.
   * - externa: delega a la pasarela y guarda la intención en Configuracion;
   *   el Pago se crea recién cuando llega el webhook firmado 'aprobado'
   *   (una fila Pago en el schema representa dinero efectivamente cobrado).
   */
  async iniciarCobro(dto: IniciarCobroDto, usuarioId: string) {
    const pedido = await this.prisma.pedido.findUnique({ where: { id: dto.pedidoId } });
    if (!pedido) throw new NotFoundException('Pedido no encontrado');
    if (pedido.estadoPago === 'cobrado') throw new BadRequestException('El pedido ya está cobrado');
    if (pedido.estadoAtencion === 'cancelado') throw new BadRequestException('El pedido está cancelado');

    const resultado = await this.pasarela.iniciarCobro(dto.pedidoId, dto.montoArs);

    if (this.pasarela.pendienteConfirmacion) {
      const pendiente: CobroPendiente = {
        pedidoId: dto.pedidoId,
        montoArs: dto.montoArs,
        usuarioId,
      };
      await this.prisma.configuracion.upsert({
        where: { clave: clavePendiente(resultado.referenciaExterna) },
        create: { clave: clavePendiente(resultado.referenciaExterna), valor: JSON.stringify(pendiente) },
        update: { valor: JSON.stringify(pendiente) },
      });
    } else {
      await this.cobros.registrarPago(
        {
          pedidoId: dto.pedidoId,
          montoArs: dto.montoArs,
          medioPago: 'billetera_virtual',
          referenciaExterna: resultado.referenciaExterna,
        },
        usuarioId,
      );
    }
    return resultado;
  }

  estadoCobro(referenciaExterna: string) {
    return this.pasarela.confirmarCobro(referenciaExterna);
  }

  async reembolsar(pagoId: string) {
    await this.pasarela.reembolsar(pagoId);
    return { ok: true };
  }

  /**
   * POST /pagos/webhook — llamado por el servicio externo (sin JWT; la firma es la auth).
   * firma = hex(HMAC_SHA256(PAYMENT_WEBHOOK_SECRET, `${referenciaExterna}.${estado}`)).
   * - aprobado → registra el Pago (marca estadoPago=cobrado si completa) + emite pago.confirmado.
   * - rechazado → descarta la intención pendiente.
   * - pendiente → ack sin cambios.
   */
  async procesarWebhook(dto: WebhookPagoDto) {
    const secret = process.env.PAYMENT_WEBHOOK_SECRET;
    if (!secret) throw new ServiceUnavailableException('PAYMENT_WEBHOOK_SECRET no configurado');

    const esperada = createHmac('sha256', secret)
      .update(`${dto.referenciaExterna}.${dto.estado}`)
      .digest('hex');
    const firmaOk =
      dto.firma.length === esperada.length &&
      timingSafeEqual(Buffer.from(dto.firma, 'utf8'), Buffer.from(esperada, 'utf8'));
    if (!firmaOk) throw new UnauthorizedException('Firma de webhook inválida');

    const clave = clavePendiente(dto.referenciaExterna);
    if (dto.estado === 'aprobado') {
      const row = await this.prisma.configuracion.findUnique({ where: { clave } });
      if (!row) throw new NotFoundException('Cobro externo desconocido');
      const pendiente = JSON.parse(row.valor) as CobroPendiente;
      await this.cobros.registrarPago(
        {
          pedidoId: pendiente.pedidoId,
          montoArs: pendiente.montoArs,
          medioPago: 'billetera_virtual',
          referenciaExterna: dto.referenciaExterna,
        },
        pendiente.usuarioId,
      );
      await this.prisma.configuracion.delete({ where: { clave } });
    } else if (dto.estado === 'rechazado') {
      await this.prisma.configuracion.deleteMany({ where: { clave } });
    }
    return { ok: true };
  }
}
