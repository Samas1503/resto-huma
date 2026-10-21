import { Controller, ForbiddenException, Get, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard } from '../common/index.js';
import type { ClienteJwt } from '../auth/jwt.strategy.js';
import { ClientesService } from './clientes.service.js';

@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientes: ClientesService) {}

  // Perfil del cliente autenticado (JWT con claim tipo='cliente', emitido por /auth/google).
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: ClienteJwt) {
    if (user.tipo !== 'cliente') throw new ForbiddenException('Solo clientes');
    return this.clientes.me(user.sub);
  }
}
