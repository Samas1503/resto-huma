import { Module } from '@nestjs/common';
import { FinanzasModule } from '../finanzas/finanzas.module.js';
import { CobrosOnlineService } from './cobros-online.service.js';
import { PagosController } from './pagos.controller.js';
import { PasarelaManualService } from './pasarela-manual.service.js';
import { PasarelaExternaService } from './pasarela-externa.service.js';
import { PASARELA_PAGO } from './pasarela-pago.port.js';
import type { PasarelaPagoAdapter } from './pasarela-pago.port.js';
import { WebhookController } from './webhook.controller.js';

/**
 * PasarelaPagoModule (spec 001 B5): provider factory por env PAYMENT_PROVIDER.
 * - manual  → PasarelaManualService (registra el pago local, referencia sintética)
 * - externa → PasarelaExternaService (HTTP a PAYMENT_GATEWAY_URL con Bearer
 *             PAYMENT_GATEWAY_KEY; confirma vía webhook firmado)
 * Se lee process.env directamente porque ConfigModule no está registrado aún
 * (queda a cargo del parent si A1 lo agrega global).
 */
@Module({
  imports: [FinanzasModule],
  controllers: [PagosController, WebhookController],
  providers: [
    PasarelaManualService,
    CobrosOnlineService,
    {
      provide: PASARELA_PAGO,
      inject: [PasarelaManualService],
      useFactory: (manual: PasarelaManualService): PasarelaPagoAdapter => {
        const provider = (process.env.PAYMENT_PROVIDER ?? 'manual').trim();
        if (provider === 'externa') {
          const url = process.env.PAYMENT_GATEWAY_URL;
          const key = process.env.PAYMENT_GATEWAY_KEY;
          if (!url || !key) {
            throw new Error(
              'PAYMENT_PROVIDER=externa requiere PAYMENT_GATEWAY_URL y PAYMENT_GATEWAY_KEY',
            );
          }
          return new PasarelaExternaService(url, key);
        }
        return manual;
      },
    },
  ],
  exports: [PASARELA_PAGO],
})
export class PagosModule {}
