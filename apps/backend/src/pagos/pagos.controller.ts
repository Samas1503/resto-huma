import { Body, Controller, Get, Param, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { Auth, CurrentUser } from '../common/index.js';
import type { JwtUser } from '../common/index.js';
import { CobrosOnlineService } from './cobros-online.service.js';
import { IniciarCobroDto, ReembolsarCobroDto } from './dto/iniciar-cobro.dto.js';

// Cobros online vía pasarela (puerto PASARELA_PAGO por env PAYMENT_PROVIDER).
@Controller('pagos')
@Auth('cajero', 'admin')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class PagosController {
  constructor(private online: CobrosOnlineService) {}

  @Post('cobros')
  iniciarCobro(@Body() dto: IniciarCobroDto, @CurrentUser() user: JwtUser) {
    return this.online.iniciarCobro(dto, user.sub);
  }

  @Get('cobros/:referenciaExterna')
  estadoCobro(@Param('referenciaExterna') referenciaExterna: string) {
    return this.online.estadoCobro(referenciaExterna);
  }

  @Post('reembolsos')
  @Auth('admin')
  reembolsar(@Body() dto: ReembolsarCobroDto) {
    return this.online.reembolsar(dto.pagoId);
  }
}
