import { Body, Controller, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { CobrosOnlineService } from './cobros-online.service.js';
import { WebhookPagoDto } from './dto/webhook-pago.dto.js';

/**
 * Endpoint público del servicio externo de cobros: la firma HMAC es la autenticación
 * (no lleva JWT). Solo tiene sentido con PAYMENT_PROVIDER=externa.
 */
@Controller('pagos')
@UsePipes(new ValidationPipe({ whitelist: true }))
export class WebhookController {
  constructor(private online: CobrosOnlineService) {}

  @Post('webhook')
  procesar(@Body() dto: WebhookPagoDto) {
    return this.online.procesarWebhook(dto);
  }
}
