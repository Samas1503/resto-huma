import { BadRequestException, Body, Controller, ForbiddenException, Get, Param, Post } from '@nestjs/common';
import { Auth, CurrentUser, type JwtUser } from '../common/index.js';
import { PedidosService } from './pedidos.service.js';
import { CrearPedidoDto } from './dto/crear-pedido.dto.js';
import type { PedidoDto } from './pedidos.types.js';

// Pedidos por canal público: invitados (sin login) y clientes con cuenta.
@Controller('pedidos')
export class PedidosPublicoController {
  constructor(private readonly pedidos: PedidosService) {}

  // Invitado: solo canal virtual (takeaway/delivery); sin mozo.
  @Post('publico')
  crearPublico(@Body() dto: CrearPedidoDto): Promise<PedidoDto> {
    if (dto.canal !== 'virtual') {
      throw new BadRequestException('El pedido público solo admite canal virtual');
    }
    return this.pedidos.crear(dto);
  }

  // Cliente con cuenta: sus pedidos (claim tipo:'cliente' de B1).
  @Get('mios')
  @Auth()
  mios(@CurrentUser() user: JwtUser): Promise<PedidoDto[]> {
    const tipo = (user as JwtUser & { tipo?: string }).tipo;
    if (tipo !== 'cliente') throw new ForbiddenException('Solo clientes');
    return this.pedidos.listar({ clienteId: user.sub });
  }

  // Seguimiento invitado: solo estado/fechas, sin datos de staff ni pagos.
  // El cuid del pedido actúa como token de acceso (no enumerable).
  @Get(':id/seguimiento')
  async seguimiento(@Param('id') id: string) {
    const p = await this.pedidos.findOne(id);
    return {
      id: p.id,
      subtipo: p.subtipo,
      estadoAtencion: p.estadoAtencion,
      items: p.items,
      createdAt: p.createdAt,
      confirmadoAt: p.confirmadoAt,
      listoAt: p.listoAt,
      entregadoAt: p.entregadoAt,
    };
  }
}
