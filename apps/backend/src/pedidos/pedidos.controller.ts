import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Auth, CurrentUser, type JwtUser } from '../common/index.js';
import { PedidosService } from './pedidos.service.js';
import { CrearPedidoDto } from './dto/crear-pedido.dto.js';
import { AgregarItemsDto } from './dto/agregar-items.dto.js';
import { CambiarEstadoAtencionDto } from './dto/cambiar-estado.dto.js';
import { ListarPedidosQueryDto } from './dto/query.dto.js';
import type { PedidoDto } from './pedidos.types.js';

@Controller('pedidos')
export class PedidosController {
  constructor(private readonly pedidos: PedidosService) {}

  // Toma de pedido (presencial: mozo en mesa/mostrador; virtual: takeaway/delivery).
  // TODO(parent): el alta virtual por el cliente requiere el guard de Cliente OAuth (B1).
  @Post()
  @Auth('mozo', 'cajero', 'admin')
  crear(@Body() dto: CrearPedidoDto, @CurrentUser() user: JwtUser): Promise<PedidoDto> {
    return this.pedidos.crear(dto, user);
  }

  // Bandeja de pedidos virtuales pendientes de confirmación.
  @Get('bandeja')
  @Auth('cajero', 'admin')
  bandeja(): Promise<PedidoDto[]> {
    return this.pedidos.bandejaVirtual();
  }

  @Get()
  @Auth('mozo', 'cocina', 'cajero', 'repartidor', 'admin')
  listar(@Query() query: ListarPedidosQueryDto): Promise<PedidoDto[]> {
    return this.pedidos.listar(query);
  }

  @Get(':id')
  @Auth()
  findOne(@Param('id') id: string): Promise<PedidoDto> {
    return this.pedidos.findOne(id);
  }

  // Adición: agrega ítems al pedido generando una NUEVA comanda.
  @Post(':id/items')
  @Auth('mozo', 'cajero', 'admin')
  agregarItems(
    @Param('id') id: string,
    @Body() dto: AgregarItemsDto,
    @CurrentUser() user: JwtUser,
  ): Promise<PedidoDto> {
    return this.pedidos.agregarItems(id, dto, user);
  }

  @Patch(':id/estado')
  @Auth('mozo', 'cocina', 'cajero', 'repartidor', 'admin')
  cambiarEstado(
    @Param('id') id: string,
    @Body() dto: CambiarEstadoAtencionDto,
    @CurrentUser() user: JwtUser,
  ): Promise<PedidoDto> {
    return this.pedidos.cambiarEstado(id, dto, user);
  }
}
